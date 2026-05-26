/// Doctor Model - Represents doctor profile data from the API.
/// Includes professional details, ratings, specializations, and fees.

class DoctorModel {
  final int id;
  final int userId;
  final String? fullName;
  final String? email;
  final String? avatarUrl;
  final String qualification;
  final int experienceYears;
  final String? bio;
  final String? hospitalName;
  final String? languages;
  final double consultationFee;
  final double followUpFee;
  final bool videoConsultation;
  final bool chatConsultation;
  final bool inClinic;
  final double rating;
  final int totalReviews;
  final int totalConsultations;
  final bool isVerified;
  final bool isAvailable;
  final List<Specialization> specializations;

  DoctorModel({
    required this.id,
    required this.userId,
    this.fullName,
    this.email,
    this.avatarUrl,
    required this.qualification,
    required this.experienceYears,
    this.bio,
    this.hospitalName,
    this.languages,
    required this.consultationFee,
    required this.followUpFee,
    this.videoConsultation = true,
    this.chatConsultation = true,
    this.inClinic = true,
    this.rating = 0.0,
    this.totalReviews = 0,
    this.totalConsultations = 0,
    this.isVerified = false,
    this.isAvailable = true,
    this.specializations = const [],
  });

  /// Create DoctorModel from API JSON response
  factory DoctorModel.fromJson(Map<String, dynamic> json) {
    return DoctorModel(
      id: json['id'],
      userId: json['user_id'],
      fullName: json['full_name'],
      email: json['email'],
      avatarUrl: json['avatar_url'],
      qualification: json['qualification'],
      experienceYears: json['experience_years'],
      bio: json['bio'],
      hospitalName: json['hospital_name'],
      languages: json['languages'],
      consultationFee: (json['consultation_fee'] as num).toDouble(),
      followUpFee: (json['follow_up_fee'] as num).toDouble(),
      videoConsultation: json['video_consultation'] ?? true,
      chatConsultation: json['chat_consultation'] ?? true,
      inClinic: json['in_clinic'] ?? true,
      rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
      totalReviews: json['total_reviews'] ?? 0,
      totalConsultations: json['total_consultations'] ?? 0,
      isVerified: json['is_verified'] ?? false,
      isAvailable: json['is_available'] ?? true,
      specializations: (json['specializations'] as List<dynamic>?)
              ?.map((s) => Specialization.fromJson(s))
              .toList() ??
          [],
    );
  }

  /// Get primary specialization name for display
  String get primarySpecialization =>
      specializations.isNotEmpty ? specializations.first.name : 'General';
}

/// Specialization sub-model
class Specialization {
  final int id;
  final String name;
  final String? description;
  final String? icon;

  Specialization({
    required this.id,
    required this.name,
    this.description,
    this.icon,
  });

  factory Specialization.fromJson(Map<String, dynamic> json) {
    return Specialization(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      icon: json['icon'],
    );
  }
}
