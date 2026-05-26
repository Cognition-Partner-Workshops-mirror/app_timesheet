"""
Pose Estimation Module using MediaPipe.

Detects 33 body landmarks from a full-body image, including key points
for shoulders, elbows, wrists, hips, knees, and ankles. These landmarks
are critical for:
- Determining body pose and orientation
- Calculating body measurements for garment sizing
- Aligning garment keypoints with body keypoints during try-on

MediaPipe Pose is chosen for its real-time performance (< 50ms per frame)
and ability to run on both CPU and GPU.
"""

from dataclasses import dataclass
from typing import List, Optional, Tuple

import cv2
import numpy as np
import structlog

logger = structlog.get_logger(__name__)

# MediaPipe landmark indices for key body parts used in garment fitting
LANDMARK_INDICES = {
    "nose": 0,
    "left_shoulder": 11,
    "right_shoulder": 12,
    "left_elbow": 13,
    "right_elbow": 14,
    "left_wrist": 15,
    "right_wrist": 16,
    "left_hip": 23,
    "right_hip": 24,
    "left_knee": 25,
    "right_knee": 26,
    "left_ankle": 27,
    "right_ankle": 28,
}


@dataclass
class PoseKeypoint:
    """A single body landmark with 2D coordinates and confidence score."""
    name: str
    x: float  # Normalized x coordinate (0.0 - 1.0)
    y: float  # Normalized y coordinate (0.0 - 1.0)
    z: float  # Depth estimate (relative to hip center)
    confidence: float  # Detection confidence (0.0 - 1.0)


@dataclass
class PoseResult:
    """Complete pose estimation result with all detected keypoints and metrics."""
    keypoints: List[PoseKeypoint]
    overall_confidence: float
    body_measurements: dict  # Computed body dimensions
    pose_orientation: str  # "frontal", "side_left", "side_right", "back"
    keypoint_map: Optional[np.ndarray] = None  # Visual keypoint overlay


class PoseEstimator:
    """
    Wrapper around MediaPipe Pose for human body landmark detection.
    Provides methods to detect pose, extract body measurements,
    and generate pose keypoint maps for the try-on pipeline.
    """

    def __init__(self, min_detection_confidence: float = 0.5, use_gpu: bool = True):
        """
        Initialize the MediaPipe Pose model.
        Model is loaded into memory on first use and cached for subsequent calls.
        """
        self.min_detection_confidence = min_detection_confidence
        self.use_gpu = use_gpu
        self._model = None
        logger.info("pose_estimator_initialized", confidence=min_detection_confidence)

    def _load_model(self):
        """Lazy-load the MediaPipe Pose model on first inference call."""
        import mediapipe as mp
        self._model = mp.solutions.pose.Pose(
            static_image_mode=True,
            model_complexity=2,  # Most accurate model (0, 1, or 2)
            enable_segmentation=True,
            min_detection_confidence=self.min_detection_confidence,
        )
        logger.info("mediapipe_pose_model_loaded")

    def detect_pose(self, image: np.ndarray) -> PoseResult:
        """
        Detect human body pose from an input image.

        Args:
            image: BGR image as numpy array (H, W, 3)

        Returns:
            PoseResult with detected keypoints, measurements, and orientation.
        """
        if self._model is None:
            self._load_model()

        # MediaPipe expects RGB input
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self._model.process(rgb_image)

        if not results.pose_landmarks:
            logger.warning("no_pose_detected")
            return PoseResult(
                keypoints=[],
                overall_confidence=0.0,
                body_measurements={},
                pose_orientation="unknown",
            )

        # Extract keypoints for body parts relevant to garment fitting
        keypoints = []
        confidences = []
        for name, idx in LANDMARK_INDICES.items():
            landmark = results.pose_landmarks.landmark[idx]
            keypoints.append(PoseKeypoint(
                name=name,
                x=landmark.x,
                y=landmark.y,
                z=landmark.z,
                confidence=landmark.visibility,
            ))
            confidences.append(landmark.visibility)

        overall_confidence = float(np.mean(confidences))

        # Compute body measurements from keypoint positions
        measurements = self._compute_body_measurements(keypoints, image.shape)

        # Determine pose orientation based on shoulder/hip alignment
        orientation = self._determine_orientation(keypoints)

        # Generate keypoint visualization map
        keypoint_map = self._generate_keypoint_map(image, keypoints)

        logger.info(
            "pose_detected",
            confidence=overall_confidence,
            orientation=orientation,
            num_keypoints=len(keypoints),
        )

        return PoseResult(
            keypoints=keypoints,
            overall_confidence=overall_confidence,
            body_measurements=measurements,
            pose_orientation=orientation,
            keypoint_map=keypoint_map,
        )

    def _compute_body_measurements(
        self, keypoints: List[PoseKeypoint], image_shape: Tuple
    ) -> dict:
        """
        Compute approximate body measurements from detected keypoints.
        Values are in pixel coordinates relative to the input image dimensions.
        """
        height, width = image_shape[:2]
        kp_dict = {kp.name: kp for kp in keypoints}

        measurements = {}

        # Shoulder width (distance between left and right shoulders)
        if "left_shoulder" in kp_dict and "right_shoulder" in kp_dict:
            ls = kp_dict["left_shoulder"]
            rs = kp_dict["right_shoulder"]
            measurements["shoulder_width_px"] = abs(ls.x - rs.x) * width
            measurements["shoulder_center_x"] = ((ls.x + rs.x) / 2) * width
            measurements["shoulder_center_y"] = ((ls.y + rs.y) / 2) * height

        # Torso length (shoulder center to hip center)
        if all(k in kp_dict for k in ["left_shoulder", "right_shoulder", "left_hip", "right_hip"]):
            shoulder_y = (kp_dict["left_shoulder"].y + kp_dict["right_shoulder"].y) / 2
            hip_y = (kp_dict["left_hip"].y + kp_dict["right_hip"].y) / 2
            measurements["torso_length_px"] = abs(hip_y - shoulder_y) * height

        # Hip width
        if "left_hip" in kp_dict and "right_hip" in kp_dict:
            lh = kp_dict["left_hip"]
            rh = kp_dict["right_hip"]
            measurements["hip_width_px"] = abs(lh.x - rh.x) * width

        # Arm length (shoulder to wrist)
        if "left_shoulder" in kp_dict and "left_wrist" in kp_dict:
            ls = kp_dict["left_shoulder"]
            lw = kp_dict["left_wrist"]
            measurements["left_arm_length_px"] = np.sqrt(
                ((ls.x - lw.x) * width) ** 2 + ((ls.y - lw.y) * height) ** 2
            )

        # Approximate body height (nose to ankle)
        if "nose" in kp_dict and "left_ankle" in kp_dict:
            nose = kp_dict["nose"]
            ankle = kp_dict["left_ankle"]
            measurements["body_height_px"] = abs(ankle.y - nose.y) * height

        return measurements

    def _determine_orientation(self, keypoints: List[PoseKeypoint]) -> str:
        """
        Determine body pose orientation based on the relative z-depth
        of left vs right shoulders and the visibility of keypoints.
        """
        kp_dict = {kp.name: kp for kp in keypoints}

        if "left_shoulder" not in kp_dict or "right_shoulder" not in kp_dict:
            return "unknown"

        ls = kp_dict["left_shoulder"]
        rs = kp_dict["right_shoulder"]

        # Use z-depth difference to determine orientation
        z_diff = ls.z - rs.z

        if abs(z_diff) < 0.1:
            return "frontal"
        elif z_diff > 0.1:
            return "side_right"
        else:
            return "side_left"

    def _generate_keypoint_map(
        self, image: np.ndarray, keypoints: List[PoseKeypoint]
    ) -> np.ndarray:
        """
        Generate a visualization of detected keypoints overlaid on the image.
        Draws circles at keypoint locations and lines connecting body parts.
        """
        height, width = image.shape[:2]
        overlay = image.copy()

        # Draw keypoints as colored circles
        for kp in keypoints:
            x = int(kp.x * width)
            y = int(kp.y * height)
            # Green for high confidence, red for low
            color = (0, 255, 0) if kp.confidence > 0.7 else (0, 0, 255)
            cv2.circle(overlay, (x, y), 5, color, -1)

        # Draw skeletal connections between keypoints
        connections = [
            ("left_shoulder", "right_shoulder"),
            ("left_shoulder", "left_elbow"),
            ("left_elbow", "left_wrist"),
            ("right_shoulder", "right_elbow"),
            ("right_elbow", "right_wrist"),
            ("left_shoulder", "left_hip"),
            ("right_shoulder", "right_hip"),
            ("left_hip", "right_hip"),
            ("left_hip", "left_knee"),
            ("left_knee", "left_ankle"),
            ("right_hip", "right_knee"),
            ("right_knee", "right_ankle"),
        ]

        kp_dict = {kp.name: kp for kp in keypoints}
        for start, end in connections:
            if start in kp_dict and end in kp_dict:
                pt1 = (int(kp_dict[start].x * width), int(kp_dict[start].y * height))
                pt2 = (int(kp_dict[end].x * width), int(kp_dict[end].y * height))
                cv2.line(overlay, pt1, pt2, (255, 255, 0), 2)

        return overlay

    def cleanup(self):
        """Release model resources."""
        if self._model:
            self._model.close()
            self._model = None
            logger.info("pose_estimator_cleaned_up")
