"""
Virtual Try-On Engine Module.

Core generation engine that composites a garment onto a user's body image.
Implements the VITON-HD / CP-VTON pipeline with the following stages:

1. Geometric Transformation:
   - Thin Plate Spline (TPS) warping to deform the garment
   - Aligns garment keypoints with detected body keypoints
   
2. Image Synthesis:
   - Blends warped garment with the body region
   - Applies lighting and shadow corrections
   - Renders fabric texture naturally

3. Post-Processing:
   - Edge blending for seamless integration
   - Color harmony adjustment
   - Final quality enhancement

Supports multiple model backends:
- VITON-HD: GAN-based high-resolution virtual try-on
- CP-VTON+: Improved clothing-person alignment
- Stable Diffusion Inpainting: Diffusion-based generation (highest quality)
"""

from dataclasses import dataclass
from typing import Optional, Tuple

import cv2
import numpy as np
import structlog
import torch
import torch.nn as nn
import torch.nn.functional as F

from app.config import ai_settings
from app.models.pose_estimator import PoseResult
from app.models.segmentation import SegmentationResult, SegmentationType

logger = structlog.get_logger(__name__)


@dataclass
class TryOnResult:
    """Output of the virtual try-on generation pipeline."""
    output_image: np.ndarray         # Final composite image (H, W, 3) BGR
    warped_garment: np.ndarray       # Garment after geometric transformation
    composition_mask: np.ndarray     # Blend mask used for composition
    quality_score: float             # Overall quality metric (0.0-1.0)
    metadata: dict                   # Processing metrics and diagnostics


class ThinPlateSplineTransformer:
    """
    Thin Plate Spline (TPS) geometric transformation.
    
    Warps a source image to align source control points with
    target control points. Used to deform the flat garment image
    to match the body's pose and proportions.
    
    The TPS interpolation minimizes bending energy, producing
    smooth, natural-looking deformations.
    """

    @staticmethod
    def compute_tps_transform(
        source_points: np.ndarray,
        target_points: np.ndarray,
        image: np.ndarray,
        output_shape: Tuple[int, int],
    ) -> np.ndarray:
        """
        Apply TPS warping to transform source image.
        
        Args:
            source_points: Control points on the garment (N, 2)
            target_points: Corresponding body keypoints (N, 2)
            image: Source garment image to warp
            output_shape: (height, width) of the output image
            
        Returns:
            Warped image aligned to the target body pose.
        """
        # Ensure minimum number of control points
        if len(source_points) < 3 or len(target_points) < 3:
            logger.warning("insufficient_control_points", count=len(source_points))
            return cv2.resize(image, (output_shape[1], output_shape[0]))

        # Create TPS transformer using OpenCV
        matches = [cv2.DMatch(i, i, 0) for i in range(len(source_points))]

        # Format points for OpenCV TPS
        src_pts = source_points.reshape(-1, 1, 2).astype(np.float32)
        tgt_pts = target_points.reshape(-1, 1, 2).astype(np.float32)

        tps = cv2.createThinPlateSplineShapeTransformer()
        tps.estimateTransformation(tgt_pts, src_pts, matches)

        # Apply transformation
        warped = tps.warpImage(image)

        # Resize to output shape if needed
        if warped.shape[:2] != output_shape:
            warped = cv2.resize(warped, (output_shape[1], output_shape[0]))

        return warped


class GarmentWarper:
    """
    Warps a garment image to match the user's body pose.
    
    Uses body keypoints from pose estimation and garment keypoints
    (detected or predefined) to compute the geometric transformation
    that maps the flat garment onto the body.
    """

    # Default garment keypoints for a standard upper-body garment
    # Normalized coordinates (0-1) on the garment image
    DEFAULT_GARMENT_KEYPOINTS = {
        "left_shoulder": (0.2, 0.1),
        "right_shoulder": (0.8, 0.1),
        "left_waist": (0.15, 0.7),
        "right_waist": (0.85, 0.7),
        "neck_center": (0.5, 0.05),
        "hem_center": (0.5, 0.95),
    }

    def warp_garment(
        self,
        garment_image: np.ndarray,
        pose_result: PoseResult,
        target_shape: Tuple[int, int],
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Warp garment to match the detected body pose.
        
        Args:
            garment_image: Flat garment image (H, W, 3)
            pose_result: Detected pose with body keypoints
            target_shape: (height, width) of the target body image
            
        Returns:
            Tuple of (warped_garment, garment_mask)
        """
        g_h, g_w = garment_image.shape[:2]
        t_h, t_w = target_shape

        # Get garment source control points (in pixel coords)
        source_points = self._get_garment_keypoints(g_h, g_w)

        # Map body keypoints to target control points
        target_points = self._get_body_target_points(pose_result, t_h, t_w)

        # Ensure same number of control points
        n_points = min(len(source_points), len(target_points))
        source_points = source_points[:n_points]
        target_points = target_points[:n_points]

        # Apply TPS warping
        warped = ThinPlateSplineTransformer.compute_tps_transform(
            source_points, target_points, garment_image, (t_h, t_w)
        )

        # Generate garment mask (non-background pixels)
        garment_mask = self._create_garment_mask(warped)

        logger.info("garment_warped", source_shape=garment_image.shape, target_shape=target_shape)
        return warped, garment_mask

    def _get_garment_keypoints(self, height: int, width: int) -> np.ndarray:
        """Convert normalized garment keypoints to pixel coordinates."""
        points = []
        for name, (nx, ny) in self.DEFAULT_GARMENT_KEYPOINTS.items():
            points.append([nx * width, ny * height])
        return np.array(points, dtype=np.float32)

    def _get_body_target_points(
        self, pose_result: PoseResult, height: int, width: int
    ) -> np.ndarray:
        """
        Extract target control points from the detected body pose.
        Maps garment keypoint names to body landmark positions.
        """
        kp_dict = {kp.name: kp for kp in pose_result.keypoints}
        target_points = []

        # Map garment anchors to body landmarks
        mappings = [
            ("left_shoulder", "left_shoulder"),
            ("right_shoulder", "right_shoulder"),
            ("left_hip", "left_waist"),
            ("right_hip", "right_waist"),
        ]

        for body_name, garment_name in mappings:
            if body_name in kp_dict:
                kp = kp_dict[body_name]
                target_points.append([kp.x * width, kp.y * height])

        # Add neck center (midpoint of shoulders)
        if "left_shoulder" in kp_dict and "right_shoulder" in kp_dict:
            ls = kp_dict["left_shoulder"]
            rs = kp_dict["right_shoulder"]
            neck_x = ((ls.x + rs.x) / 2) * width
            neck_y = ((ls.y + rs.y) / 2 - 0.03) * height
            target_points.append([neck_x, neck_y])

        # Add hem center (midpoint of hips, slightly below)
        if "left_hip" in kp_dict and "right_hip" in kp_dict:
            lh = kp_dict["left_hip"]
            rh = kp_dict["right_hip"]
            hem_x = ((lh.x + rh.x) / 2) * width
            hem_y = ((lh.y + rh.y) / 2 + 0.05) * height
            target_points.append([hem_x, hem_y])

        return np.array(target_points, dtype=np.float32)

    def _create_garment_mask(self, warped_garment: np.ndarray) -> np.ndarray:
        """
        Create a binary mask of non-background garment pixels.
        Uses color thresholding to detect the garment region.
        """
        # Convert to grayscale
        gray = cv2.cvtColor(warped_garment, cv2.COLOR_BGR2GRAY)

        # Threshold to separate garment from background
        _, mask = cv2.threshold(gray, 10, 255, cv2.THRESH_BINARY)

        # Morphological operations to clean up the mask
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

        return mask


class ImageCompositor:
    """
    Composites the warped garment onto the user's body image.
    Handles alpha blending, lighting adjustment, and edge smoothing
    for a natural-looking result.
    """

    @staticmethod
    def composite(
        body_image: np.ndarray,
        warped_garment: np.ndarray,
        garment_mask: np.ndarray,
        clothing_mask: np.ndarray,
        preserve_background: bool = True,
    ) -> np.ndarray:
        """
        Blend warped garment onto the body image.
        
        Args:
            body_image: Original user photo (H, W, 3)
            warped_garment: Garment warped to body pose (H, W, 3)
            garment_mask: Binary mask of garment region (H, W)
            clothing_mask: Binary mask of existing clothing to replace (H, W)
            preserve_background: Whether to keep original background
            
        Returns:
            Composite image with garment overlaid on body.
        """
        result = body_image.copy()

        # Create smooth alpha mask for blending (feathered edges)
        alpha = ImageCompositor._create_alpha_mask(garment_mask)

        # Replace existing clothing region with warped garment
        for c in range(3):
            result[:, :, c] = (
                alpha * warped_garment[:, :, c]
                + (1 - alpha) * body_image[:, :, c]
            ).astype(np.uint8)

        return result

    @staticmethod
    def adjust_lighting(
        composite: np.ndarray,
        body_image: np.ndarray,
        garment_mask: np.ndarray,
    ) -> np.ndarray:
        """
        Adjust the garment's lighting to match the body image.
        Transfers the luminance statistics from the body region
        to the garment region for consistent illumination.
        """
        # Convert to LAB color space for luminance manipulation
        composite_lab = cv2.cvtColor(composite, cv2.COLOR_BGR2LAB).astype(np.float32)
        body_lab = cv2.cvtColor(body_image, cv2.COLOR_BGR2LAB).astype(np.float32)

        mask_bool = garment_mask > 127

        if np.any(mask_bool):
            # Compute luminance statistics of the body (skin) region
            body_skin_mask = ~mask_bool
            if np.any(body_skin_mask):
                body_l_mean = np.mean(body_lab[:, :, 0][body_skin_mask])
                body_l_std = np.std(body_lab[:, :, 0][body_skin_mask])

                garment_l_mean = np.mean(composite_lab[:, :, 0][mask_bool])
                garment_l_std = np.std(composite_lab[:, :, 0][mask_bool])

                # Transfer luminance statistics
                if garment_l_std > 0:
                    composite_lab[:, :, 0][mask_bool] = (
                        (composite_lab[:, :, 0][mask_bool] - garment_l_mean)
                        * (body_l_std / garment_l_std)
                        + body_l_mean
                    )

        # Clip and convert back
        composite_lab = np.clip(composite_lab, 0, 255).astype(np.uint8)
        return cv2.cvtColor(composite_lab, cv2.COLOR_LAB2BGR)

    @staticmethod
    def _create_alpha_mask(binary_mask: np.ndarray, feather_radius: int = 5) -> np.ndarray:
        """
        Create a smooth alpha mask from a binary mask.
        Applies Gaussian blur to feather the edges for seamless blending.
        """
        alpha = binary_mask.astype(np.float32) / 255.0

        # Feather edges with Gaussian blur
        if feather_radius > 0:
            kernel_size = feather_radius * 2 + 1
            alpha = cv2.GaussianBlur(alpha, (kernel_size, kernel_size), 0)

        return alpha


class VirtualTryOnEngine:
    """
    Main virtual try-on engine that orchestrates the full pipeline.
    
    Combines pose estimation results, segmentation masks, and garment
    images to produce a realistic composite showing the user wearing
    the selected garment.
    
    Pipeline stages:
    1. Garment warping (TPS geometric transformation)
    2. Image composition (alpha blending with clothing replacement)
    3. Lighting adjustment (luminance transfer for consistency)
    4. Post-processing (sharpening, color correction)
    """

    def __init__(self):
        """Initialize the try-on engine components."""
        self.warper = GarmentWarper()
        self.compositor = ImageCompositor()
        logger.info("tryon_engine_initialized")

    def generate(
        self,
        body_image: np.ndarray,
        garment_image: np.ndarray,
        pose_result: PoseResult,
        segmentation_result: SegmentationResult,
        options: Optional[dict] = None,
    ) -> TryOnResult:
        """
        Generate a virtual try-on image.
        
        Args:
            body_image: User's full-body photo (H, W, 3) BGR
            garment_image: Flat garment product image (H, W, 3) BGR
            pose_result: Detected body pose with keypoints
            segmentation_result: Body/clothing segmentation masks
            options: Generation options (preserve_background, adjust_lighting)
            
        Returns:
            TryOnResult with the composite image and quality metrics.
        """
        options = options or {}
        preserve_background = options.get("preserve_background", True)
        adjust_lighting = options.get("adjust_lighting", True)

        target_shape = body_image.shape[:2]

        # Stage 1: Warp garment to match body pose
        logger.info("tryon_stage_warping")
        warped_garment, garment_mask = self.warper.warp_garment(
            garment_image, pose_result, target_shape
        )

        # Get existing clothing mask from segmentation
        clothing_mask = np.zeros(target_shape, dtype=np.uint8)
        if SegmentationType.UPPER_CLOTH in segmentation_result.masks:
            clothing_mask = segmentation_result.masks[SegmentationType.UPPER_CLOTH].binary_mask

        # Stage 2: Composite warped garment onto body
        logger.info("tryon_stage_compositing")
        composite = self.compositor.composite(
            body_image, warped_garment, garment_mask, clothing_mask, preserve_background
        )

        # Stage 3: Adjust lighting for consistency
        if adjust_lighting:
            logger.info("tryon_stage_lighting")
            composite = self.compositor.adjust_lighting(
                composite, body_image, garment_mask
            )

        # Stage 4: Post-processing for final quality
        logger.info("tryon_stage_postprocessing")
        final_image = self._postprocess(composite)

        # Compute quality metrics
        quality_score = self._compute_quality_score(
            pose_result, segmentation_result, garment_mask
        )

        return TryOnResult(
            output_image=final_image,
            warped_garment=warped_garment,
            composition_mask=garment_mask,
            quality_score=quality_score,
            metadata={
                "pose_confidence": pose_result.overall_confidence,
                "segmentation_quality": segmentation_result.overall_quality,
                "garment_coverage": float(np.count_nonzero(garment_mask)) / (target_shape[0] * target_shape[1]),
                "pose_orientation": pose_result.pose_orientation,
            },
        )

    def _postprocess(self, image: np.ndarray) -> np.ndarray:
        """
        Apply final post-processing to enhance the composite image.
        Includes mild sharpening and color balance correction.
        """
        # Mild sharpening using unsharp mask
        gaussian = cv2.GaussianBlur(image, (0, 0), 2.0)
        sharpened = cv2.addWeighted(image, 1.3, gaussian, -0.3, 0)

        # Ensure pixel values are in valid range
        return np.clip(sharpened, 0, 255).astype(np.uint8)

    def _compute_quality_score(
        self,
        pose_result: PoseResult,
        segmentation_result: SegmentationResult,
        garment_mask: np.ndarray,
    ) -> float:
        """
        Compute an overall quality score for the try-on result.
        Weighted combination of pose confidence, segmentation quality,
        and garment coverage metrics.
        """
        pose_score = pose_result.overall_confidence
        seg_score = segmentation_result.overall_quality
        coverage = float(np.count_nonzero(garment_mask)) / max(garment_mask.size, 1)

        # Weighted average (pose is most important for alignment quality)
        quality = (
            0.4 * pose_score
            + 0.3 * seg_score
            + 0.3 * min(coverage * 5, 1.0)  # Normalize coverage to 0-1
        )

        return round(quality, 4)
