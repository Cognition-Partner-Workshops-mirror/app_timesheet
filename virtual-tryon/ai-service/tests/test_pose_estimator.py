"""
Tests for the pose estimation module.
Validates body landmark detection, orientation classification,
body measurement computation, and keypoint visualization.
"""

import numpy as np
import pytest

from app.models.pose_estimator import (
    PoseEstimator,
    PoseKeypoint,
    PoseResult,
    LANDMARK_INDICES,
)


def _create_test_image(width: int = 768, height: int = 1024) -> np.ndarray:
    """Helper: create a dummy BGR image for testing."""
    return np.zeros((height, width, 3), dtype=np.uint8)


# ── PoseKeypoint dataclass tests ──

def test_pose_keypoint_creation():
    """PoseKeypoint should store name, coordinates, and confidence."""
    kp = PoseKeypoint(name="left_shoulder", x=0.4, y=0.3, z=0.01, confidence=0.95)
    assert kp.name == "left_shoulder"
    assert kp.x == 0.4
    assert kp.y == 0.3
    assert kp.confidence == 0.95


def test_pose_result_creation():
    """PoseResult should hold keypoints list and metadata."""
    kp = PoseKeypoint(name="nose", x=0.5, y=0.2, z=0.0, confidence=0.9)
    result = PoseResult(
        keypoints=[kp],
        overall_confidence=0.9,
        body_measurements={"shoulder_width_px": 200.0},
        pose_orientation="frontal",
    )
    assert len(result.keypoints) == 1
    assert result.pose_orientation == "frontal"
    assert result.keypoint_map is None


# ── PoseEstimator initialization ──

def test_pose_estimator_init():
    """PoseEstimator should initialize with config and lazy-loaded model."""
    estimator = PoseEstimator(min_detection_confidence=0.6, use_gpu=False)
    assert estimator.min_detection_confidence == 0.6
    assert estimator.use_gpu is False
    assert estimator._model is None


# ── Orientation determination tests ──

def test_orientation_frontal():
    """Frontal orientation when shoulder z-depths are similar."""
    estimator = PoseEstimator(use_gpu=False)
    keypoints = [
        PoseKeypoint("left_shoulder", 0.6, 0.3, 0.05, 0.9),
        PoseKeypoint("right_shoulder", 0.4, 0.3, 0.04, 0.9),
    ]
    orientation = estimator._determine_orientation(keypoints)
    assert orientation == "frontal"


def test_orientation_side_right():
    """Side-right orientation when left shoulder z-depth is significantly larger."""
    estimator = PoseEstimator(use_gpu=False)
    keypoints = [
        PoseKeypoint("left_shoulder", 0.6, 0.3, 0.3, 0.9),
        PoseKeypoint("right_shoulder", 0.4, 0.3, 0.0, 0.9),
    ]
    orientation = estimator._determine_orientation(keypoints)
    assert orientation == "side_right"


def test_orientation_side_left():
    """Side-left orientation when right shoulder z-depth is significantly larger."""
    estimator = PoseEstimator(use_gpu=False)
    keypoints = [
        PoseKeypoint("left_shoulder", 0.6, 0.3, 0.0, 0.9),
        PoseKeypoint("right_shoulder", 0.4, 0.3, 0.3, 0.9),
    ]
    orientation = estimator._determine_orientation(keypoints)
    assert orientation == "side_left"


def test_orientation_unknown_missing_shoulders():
    """Unknown orientation when shoulder keypoints are missing."""
    estimator = PoseEstimator(use_gpu=False)
    keypoints = [PoseKeypoint("nose", 0.5, 0.1, 0.0, 0.9)]
    orientation = estimator._determine_orientation(keypoints)
    assert orientation == "unknown"


# ── Body measurement tests ──

def test_body_measurements_shoulder_width():
    """Should compute shoulder width in pixel space."""
    estimator = PoseEstimator(use_gpu=False)
    keypoints = [
        PoseKeypoint("left_shoulder", 0.6, 0.3, 0.0, 0.9),
        PoseKeypoint("right_shoulder", 0.4, 0.3, 0.0, 0.9),
    ]
    measurements = estimator._compute_body_measurements(keypoints, (1024, 768, 3))
    assert "shoulder_width_px" in measurements
    # 0.2 * 768 = 153.6
    assert abs(measurements["shoulder_width_px"] - 153.6) < 1.0


def test_body_measurements_torso_length():
    """Should compute torso length from shoulders to hips."""
    estimator = PoseEstimator(use_gpu=False)
    keypoints = [
        PoseKeypoint("left_shoulder", 0.6, 0.3, 0.0, 0.9),
        PoseKeypoint("right_shoulder", 0.4, 0.3, 0.0, 0.9),
        PoseKeypoint("left_hip", 0.55, 0.55, 0.0, 0.9),
        PoseKeypoint("right_hip", 0.45, 0.55, 0.0, 0.9),
    ]
    measurements = estimator._compute_body_measurements(keypoints, (1024, 768, 3))
    assert "torso_length_px" in measurements
    # (0.55 - 0.3) * 1024 = 256.0
    assert abs(measurements["torso_length_px"] - 256.0) < 1.0


def test_body_measurements_hip_width():
    """Should compute hip width in pixel space."""
    estimator = PoseEstimator(use_gpu=False)
    keypoints = [
        PoseKeypoint("left_hip", 0.55, 0.55, 0.0, 0.9),
        PoseKeypoint("right_hip", 0.45, 0.55, 0.0, 0.9),
    ]
    measurements = estimator._compute_body_measurements(keypoints, (1024, 768, 3))
    assert "hip_width_px" in measurements
    # 0.1 * 768 = 76.8
    assert abs(measurements["hip_width_px"] - 76.8) < 1.0


# ── Keypoint map visualization tests ──

def test_keypoint_map_same_shape():
    """Keypoint visualization should return an image of the same size as input."""
    estimator = PoseEstimator(use_gpu=False)
    image = _create_test_image(768, 1024)
    keypoints = [
        PoseKeypoint("left_shoulder", 0.6, 0.3, 0.0, 0.9),
        PoseKeypoint("right_shoulder", 0.4, 0.3, 0.0, 0.9),
    ]
    overlay = estimator._generate_keypoint_map(image, keypoints)
    assert overlay.shape == image.shape


def test_keypoint_map_modifies_image():
    """Keypoint overlay should differ from the blank input image."""
    estimator = PoseEstimator(use_gpu=False)
    image = _create_test_image(768, 1024)
    keypoints = [
        PoseKeypoint("left_shoulder", 0.6, 0.3, 0.0, 0.9),
        PoseKeypoint("right_shoulder", 0.4, 0.3, 0.0, 0.9),
    ]
    overlay = estimator._generate_keypoint_map(image, keypoints)
    # Overlay should have non-zero pixels where keypoints were drawn
    assert np.any(overlay > 0)


# ── Landmark indices test ──

def test_landmark_indices_complete():
    """LANDMARK_INDICES should contain all required body parts."""
    required = {"nose", "left_shoulder", "right_shoulder", "left_hip", "right_hip",
                "left_knee", "right_knee", "left_ankle", "right_ankle"}
    assert required.issubset(set(LANDMARK_INDICES.keys()))


# ── Full pipeline test with real MediaPipe ──

def test_detect_pose_on_blank_image():
    """Pose detection on a blank image should return zero-confidence result."""
    estimator = PoseEstimator(min_detection_confidence=0.5, use_gpu=False)
    image = _create_test_image(768, 1024)
    result = estimator.detect_pose(image)
    # Blank image should produce no pose or very low confidence
    assert isinstance(result, PoseResult)
    assert result.overall_confidence == 0.0 or len(result.keypoints) == 0
    estimator.cleanup()
