/// User Model - Represents authenticated user data from the API.
/// Supports Patient, Doctor, and Admin roles.

class UserModel {
  final int id;
  final String email;
  final String fullName;
  final String? phone;
  final String role;
  final String? gender;
  final String? avatarUrl;
  final String? city;
  final String? state;
  final bool isActive;
  final bool isVerified;

  UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    this.phone,
    required this.role,
    this.gender,
    this.avatarUrl,
    this.city,
    this.state,
    this.isActive = true,
    this.isVerified = false,
  });

  /// Create UserModel from API JSON response
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      email: json['email'],
      fullName: json['full_name'],
      phone: json['phone'],
      role: json['role'],
      gender: json['gender'],
      avatarUrl: json['avatar_url'],
      city: json['city'],
      state: json['state'],
      isActive: json['is_active'] ?? true,
      isVerified: json['is_verified'] ?? false,
    );
  }

  /// Check user role helpers
  bool get isPatient => role == 'patient';
  bool get isDoctor => role == 'doctor';
  bool get isAdmin => role == 'admin';
}
