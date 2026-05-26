"""
Unit tests for the Pose Estimator module.
Tests keypoint detection, body measurement computation, and orientation detection.
"""

import numpy as np
import pytest

from app.models.pose_estimator import PoseKeypoint, PoseResult, PoseEstimator


class TestPoseKeypoint:
    """Tests for the PoseKeypoint data structure."""

    def test_keypoint_creation(self):
        """Should create a keypoint with all required fields."""
        kp = PoseKeypoint(
            name="left_shoulder",
            x=0.3,
            y=0.25,
            z=-0.1,
            confidence=0.95,
        )
        assert kp.name == "left_shoulder"
        assert kp.x == 0.3
        assert kp.confidence == 0.95


class TestPoseResult:
    """Tests for the PoseResult data structure."""

    def test_empty_result(self):
        """Should create a valid empty result when no pose is detected."""
        result = PoseResult(
            keypoints=[],
            overall_confidence=0.0,
            body_measurements={},
            pose_orientation="unknown",
        )
        assert len(result.keypoints) == 0
        assert result.overall_confidence == 0.0

    def test_result_with_keypoints(self):
        """Should hold multiple keypoints and computed measurements."""
        kps = [
            PoseKeypoint("left_shoulder", 0.3, 0.25, 0.0, 0.9),
            PoseKeypoint("right_shoulder", 0.7, 0.25, 0.0, 0.92),
        ]
        result = PoseResult(
            keypoints=kps,
            overall_confidence=0.91,
            body_measurements={"shoulder_width_px": 307.2},
            pose_orientation="frontal",
        )
        assert len(result.keypoints) == 2
        assert result.pose_orientation == "frontal"


class TestPoseEstimator:
    """Tests for the PoseEstimator class (without loading actual model)."""

    def test_orientation_frontal(self):
        """Should classify pose as frontal when shoulders are at similar depth."""
        estimator = PoseEstimator(min_detection_confidence=0.5, use_gpu=False)
        kps = [
            PoseKeypoint("left_shoulder", 0.3, 0.25, 0.0, 0.9),
            PoseKeypoint("right_shoulder", 0.7, 0.25, 0.0, 0.9),
        ]
        orientation = estimator._determine_orientation(kps)
        assert orientation == "frontal"

    def test_orientation_side_right(self):
        """Should classify as side_right when left shoulder is further back."""
        estimator = PoseEstimator(min_detection_confidence=0.5, use_gpu=False)
        kps = [
            PoseKeypoint("left_shoulder", 0.3, 0.25, 0.2, 0.9),
            PoseKeypoint("right_shoulder", 0.7, 0.25, 0.0, 0.9),
        ]
        orientation = estimator._determine_orientation(kps)
        assert orientation == "side_right"

    def test_body_measurements_shoulder_width(self):
        """Should compute shoulder width from left and right shoulder keypoints."""
        estimator = PoseEstimator(min_detection_confidence=0.5, use_gpu=False)
        kps = [
            PoseKeypoint("left_shoulder", 0.3, 0.25, 0.0, 0.9),
            PoseKeypoint("right_shoulder", 0.7, 0.25, 0.0, 0.9),
        ]
        # Image shape: (1024, 768, 3)
        measurements = estimator._compute_body_measurements(kps, (1024, 768, 3))
        assert "shoulder_width_px" in measurements
        # Expected: |0.3 - 0.7| * 768 = 0.4 * 768 = 307.2
        assert abs(measurements["shoulder_width_px"] - 307.2) < 0.1

    def test_keypoint_map_generation(self):
        """Should generate an overlay image with keypoint visualization."""
        estimator = PoseEstimator(min_detection_confidence=0.5, use_gpu=False)
        image = np.zeros((512, 384, 3), dtype=np.uint8)
        kps = [
            PoseKeypoint("left_shoulder", 0.3, 0.25, 0.0, 0.9),
            PoseKeypoint("right_shoulder", 0.7, 0.25, 0.0, 0.9),
        ]
        overlay = estimator._generate_keypoint_map(image, kps)
        # Output should be same shape as input
        assert overlay.shape == image.shape
        # Output should have some non-zero pixels (keypoints drawn)
        assert np.any(overlay > 0)
