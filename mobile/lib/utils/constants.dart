/// CareAI App Constants
/// Centralized configuration for API URLs, colors, and app-wide settings.

import 'package:flutter/material.dart';

class AppConstants {
  // API base URL - change to your server IP/domain in production
  static const String apiBaseUrl = 'http://10.0.2.2:8000/api/v1';
  // Use localhost for iOS simulator: 'http://localhost:8000/api/v1'
  // Use actual IP for physical device: 'http://192.168.x.x:8000/api/v1'

  static const String appName = 'CareAI';
  static const String appTagline = 'AI-Powered Healthcare';
}

/// App color palette - Medical theme (blue + green + white)
class AppColors {
  static const Color primary = Color(0xFF1A73E8);       // Google Blue
  static const Color primaryDark = Color(0xFF0D47A1);    // Dark Blue
  static const Color primaryLight = Color(0xFFBBDEFB);   // Light Blue
  static const Color accent = Color(0xFF00BFA5);          // Teal Green
  static const Color accentLight = Color(0xFFB2DFDB);     // Light Teal
  static const Color background = Color(0xFFF5F7FA);      // Light Gray BG
  static const Color surface = Color(0xFFFFFFFF);          // White
  static const Color error = Color(0xFFE53935);            // Red
  static const Color warning = Color(0xFFFFA726);          // Orange
  static const Color success = Color(0xFF43A047);          // Green
  static const Color textPrimary = Color(0xFF212121);      // Dark text
  static const Color textSecondary = Color(0xFF757575);    // Gray text
  static const Color textLight = Color(0xFFBDBDBD);        // Light gray
  static const Color divider = Color(0xFFE0E0E0);         // Divider gray
  static const Color cardShadow = Color(0x1A000000);       // Card shadow

  // Urgency level colors for AI triage
  static const Color emergency = Color(0xFFD32F2F);
  static const Color urgent = Color(0xFFF57C00);
  static const Color routine = Color(0xFF1976D2);
  static const Color selfCare = Color(0xFF388E3C);
}

/// App text styles
class AppTextStyles {
  static const TextStyle heading1 = TextStyle(
    fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.textPrimary,
  );
  static const TextStyle heading2 = TextStyle(
    fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary,
  );
  static const TextStyle heading3 = TextStyle(
    fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textPrimary,
  );
  static const TextStyle body = TextStyle(
    fontSize: 16, color: AppColors.textPrimary,
  );
  static const TextStyle bodySecondary = TextStyle(
    fontSize: 14, color: AppColors.textSecondary,
  );
  static const TextStyle caption = TextStyle(
    fontSize: 12, color: AppColors.textSecondary,
  );
  static const TextStyle button = TextStyle(
    fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white,
  );
}
