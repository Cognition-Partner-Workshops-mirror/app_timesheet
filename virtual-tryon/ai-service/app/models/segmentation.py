"""
Body and Clothing Segmentation Module.

Provides pixel-level segmentation of:
- Human body (foreground vs background)
- Clothing regions (upper body, lower body, full body garments)
- Body parts (for precise garment overlay)

Uses U-Net architecture (specifically U²-Net for high accuracy) for
semantic segmentation. The model produces binary masks that isolate
body regions and existing clothing, which are essential inputs for
the virtual try-on pipeline.

Alternative models supported:
- Mask R-CNN (instance segmentation for multi-person scenes)
- DeepLabV3+ (for fine-grained body parsing)
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import structlog
import torch
import torch.nn as nn
import torch.nn.functional as F

from app.config import ai_settings

logger = structlog.get_logger(__name__)


class SegmentationType(str, Enum):
    """Types of segmentation masks produced by the pipeline."""
    BODY = "body"              # Full body silhouette
    BACKGROUND = "background"  # Everything except the person
    UPPER_CLOTH = "upper_cloth"  # Upper body clothing
    LOWER_CLOTH = "lower_cloth"  # Lower body clothing
    SKIN = "skin"              # Exposed skin regions
    HAIR = "hair"              # Hair region


@dataclass
class SegmentationMask:
    """A single segmentation mask with its type and confidence map."""
    mask_type: SegmentationType
    binary_mask: np.ndarray      # Binary mask (H, W), values 0 or 255
    confidence_map: np.ndarray   # Per-pixel confidence (H, W), values 0.0-1.0
    area_ratio: float            # Fraction of image covered by this mask


@dataclass
class SegmentationResult:
    """Complete segmentation result with all detected regions."""
    masks: Dict[SegmentationType, SegmentationMask]
    body_parsing_map: np.ndarray   # Multi-class label map (H, W)
    overall_quality: float          # Average segmentation confidence
    image_dimensions: Tuple[int, int]  # (height, width)


class UNetBlock(nn.Module):
    """
    U-Net encoder/decoder block with two convolution layers,
    batch normalization, and ReLU activation.
    Standard building block for the segmentation network.
    """

    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(out_channels)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.relu(self.bn1(self.conv1(x)))
        x = self.relu(self.bn2(self.conv2(x)))
        return x


class UNetSegmentationModel(nn.Module):
    """
    U-Net architecture for image segmentation.
    
    Encoder-decoder network with skip connections that combines
    high-level semantic features with low-level spatial details.
    Produces multi-class segmentation maps for body parsing.
    
    Architecture:
    - 4-level encoder with max pooling downsampling
    - Bottleneck at the lowest resolution
    - 4-level decoder with transposed convolution upsampling
    - Skip connections between corresponding encoder/decoder levels
    """

    def __init__(self, in_channels: int = 3, num_classes: int = 6):
        super().__init__()

        # Encoder path (downsampling)
        self.enc1 = UNetBlock(in_channels, 64)
        self.enc2 = UNetBlock(64, 128)
        self.enc3 = UNetBlock(128, 256)
        self.enc4 = UNetBlock(256, 512)

        # Bottleneck
        self.bottleneck = UNetBlock(512, 1024)

        # Decoder path (upsampling with skip connections)
        self.up4 = nn.ConvTranspose2d(1024, 512, kernel_size=2, stride=2)
        self.dec4 = UNetBlock(1024, 512)  # 512 (skip) + 512 (up)
        self.up3 = nn.ConvTranspose2d(512, 256, kernel_size=2, stride=2)
        self.dec3 = UNetBlock(512, 256)
        self.up2 = nn.ConvTranspose2d(256, 128, kernel_size=2, stride=2)
        self.dec2 = UNetBlock(256, 128)
        self.up1 = nn.ConvTranspose2d(128, 64, kernel_size=2, stride=2)
        self.dec1 = UNetBlock(128, 64)

        # Final classification layer
        self.final_conv = nn.Conv2d(64, num_classes, kernel_size=1)

        self.pool = nn.MaxPool2d(kernel_size=2, stride=2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Encoder
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        e4 = self.enc4(self.pool(e3))

        # Bottleneck
        b = self.bottleneck(self.pool(e4))

        # Decoder with skip connections
        d4 = self.dec4(torch.cat([self.up4(b), e4], dim=1))
        d3 = self.dec3(torch.cat([self.up3(d4), e3], dim=1))
        d2 = self.dec2(torch.cat([self.up2(d3), e2], dim=1))
        d1 = self.dec1(torch.cat([self.up1(d2), e1], dim=1))

        # Final pixel-wise classification
        return self.final_conv(d1)


class BodySegmentor:
    """
    High-level segmentation interface for the virtual try-on pipeline.
    
    Manages model loading, preprocessing, inference, and post-processing
    to produce clean segmentation masks for body, clothing, and background.
    Supports both U-Net and Mask R-CNN backends.
    """

    # Class-to-type mapping for body parsing labels
    CLASS_MAP = {
        0: SegmentationType.BACKGROUND,
        1: SegmentationType.BODY,
        2: SegmentationType.UPPER_CLOTH,
        3: SegmentationType.LOWER_CLOTH,
        4: SegmentationType.SKIN,
        5: SegmentationType.HAIR,
    }

    def __init__(self, model_path: Optional[str] = None, use_gpu: bool = True):
        """
        Initialize the segmentation model.
        
        Args:
            model_path: Path to pre-trained model weights. If None, uses random init.
            use_gpu: Whether to use GPU for inference (falls back to CPU).
        """
        self.device = torch.device(
            f"cuda:{ai_settings.GPU_DEVICE_ID}" if use_gpu and torch.cuda.is_available() else "cpu"
        )
        self.model = UNetSegmentationModel(in_channels=3, num_classes=6)

        # Load pre-trained weights if available
        if model_path:
            state_dict = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(state_dict)
            logger.info("segmentation_model_loaded", path=model_path)

        self.model.to(self.device)
        self.model.eval()
        logger.info("body_segmentor_initialized", device=str(self.device))

    def segment(self, image: np.ndarray) -> SegmentationResult:
        """
        Perform full body segmentation on an input image.
        
        Args:
            image: BGR image as numpy array (H, W, 3)
            
        Returns:
            SegmentationResult with body, clothing, and background masks.
        """
        original_h, original_w = image.shape[:2]

        # Preprocess: normalize and convert to tensor
        input_tensor = self._preprocess(image)

        # Run inference
        with torch.no_grad():
            if ai_settings.MIXED_PRECISION and self.device.type == "cuda":
                with torch.cuda.amp.autocast():
                    output = self.model(input_tensor)
            else:
                output = self.model(input_tensor)

        # Post-process: convert logits to masks
        masks, parsing_map, quality = self._postprocess(
            output, original_h, original_w
        )

        logger.info(
            "segmentation_complete",
            num_masks=len(masks),
            quality=quality,
        )

        return SegmentationResult(
            masks=masks,
            body_parsing_map=parsing_map,
            overall_quality=quality,
            image_dimensions=(original_h, original_w),
        )

    def segment_body(self, image: np.ndarray) -> np.ndarray:
        """
        Extract only the body segmentation mask (binary).
        Convenience method for pipeline stages that only need body/background.
        """
        result = self.segment(image)
        if SegmentationType.BODY in result.masks:
            return result.masks[SegmentationType.BODY].binary_mask
        return np.zeros(image.shape[:2], dtype=np.uint8)

    def segment_clothing(self, image: np.ndarray) -> np.ndarray:
        """
        Extract the combined clothing region mask.
        Merges upper_cloth and lower_cloth masks into one binary mask.
        """
        result = self.segment(image)
        mask = np.zeros(image.shape[:2], dtype=np.uint8)
        for seg_type in [SegmentationType.UPPER_CLOTH, SegmentationType.LOWER_CLOTH]:
            if seg_type in result.masks:
                mask = cv2.bitwise_or(mask, result.masks[seg_type].binary_mask)
        return mask

    def _preprocess(self, image: np.ndarray) -> torch.Tensor:
        """
        Preprocess image for model input.
        Resizes, normalizes to [0, 1], and converts to NCHW tensor.
        """
        # Resize to model input dimensions
        resized = cv2.resize(
            image, (ai_settings.INPUT_WIDTH, ai_settings.INPUT_HEIGHT)
        )

        # Convert BGR to RGB and normalize to [0, 1]
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0

        # ImageNet normalization
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        normalized = (rgb - mean) / std

        # Convert to NCHW tensor
        tensor = torch.from_numpy(normalized.transpose(2, 0, 1)).unsqueeze(0)
        return tensor.to(self.device)

    def _postprocess(
        self,
        output: torch.Tensor,
        target_h: int,
        target_w: int,
    ) -> Tuple[Dict[SegmentationType, SegmentationMask], np.ndarray, float]:
        """
        Post-process model output into segmentation masks.
        Applies softmax, resizes to original dimensions, and creates binary masks.
        """
        # Softmax to get per-class probabilities
        probs = F.softmax(output, dim=1).squeeze(0).cpu().numpy()  # (C, H, W)

        # Resize probability maps to original image size
        resized_probs = np.zeros((probs.shape[0], target_h, target_w), dtype=np.float32)
        for c in range(probs.shape[0]):
            resized_probs[c] = cv2.resize(probs[c], (target_w, target_h))

        # Argmax to get pixel-wise class labels
        parsing_map = np.argmax(resized_probs, axis=0).astype(np.uint8)

        # Generate individual binary masks for each class
        masks = {}
        confidences = []
        for class_idx, seg_type in self.CLASS_MAP.items():
            binary_mask = (parsing_map == class_idx).astype(np.uint8) * 255
            confidence_map = resized_probs[class_idx]

            area_ratio = np.count_nonzero(binary_mask) / (target_h * target_w)

            # Only include masks with meaningful area
            if area_ratio > 0.001:
                masks[seg_type] = SegmentationMask(
                    mask_type=seg_type,
                    binary_mask=binary_mask,
                    confidence_map=confidence_map,
                    area_ratio=area_ratio,
                )
                confidences.append(float(np.mean(confidence_map[binary_mask > 0])))

        overall_quality = float(np.mean(confidences)) if confidences else 0.0

        return masks, parsing_map, overall_quality

    def cleanup(self):
        """Release GPU memory and model resources."""
        del self.model
        if self.device.type == "cuda":
            torch.cuda.empty_cache()
        logger.info("segmentor_cleaned_up")
