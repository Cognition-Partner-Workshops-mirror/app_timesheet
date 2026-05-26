/// Doctor Profile Screen - Detailed doctor info with appointment booking.
/// Shows qualification, ratings, schedule, and consultation options.

import 'package:flutter/material.dart';
import '../../models/doctor_model.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';
import 'book_appointment_screen.dart';

class DoctorProfileScreen extends StatelessWidget {
  final DoctorModel doctor;
  const DoctorProfileScreen({super.key, required this.doctor});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // Gradient app bar with doctor info
          SliverAppBar(
            expandedHeight: 240,
            pinned: true,
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.primary, AppColors.primaryDark],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: SafeArea(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: 40),
                      CircleAvatar(
                        radius: 44,
                        backgroundColor: Colors.white24,
                        child: Text(
                          (doctor.fullName ?? 'D')[0],
                          style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(doctor.fullName ?? 'Doctor',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                      const SizedBox(height: 4),
                      Text(doctor.primarySpecialization,
                          style: const TextStyle(fontSize: 15, color: Colors.white70)),
                      if (doctor.hospitalName != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(doctor.hospitalName!,
                              style: const TextStyle(fontSize: 13, color: Colors.white60)),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Stats row
                  Row(
                    children: [
                      _StatCard(value: '${doctor.experienceYears}', label: 'Years Exp'),
                      _StatCard(value: '${doctor.rating}', label: 'Rating', icon: Icons.star),
                      _StatCard(value: '${doctor.totalConsultations}', label: 'Patients'),
                      _StatCard(value: '${doctor.totalReviews}', label: 'Reviews'),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // About section
                  const Text('About', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(doctor.bio ?? 'Experienced healthcare professional dedicated to providing quality care.',
                      style: const TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.5)),

                  const SizedBox(height: 20),

                  // Qualifications
                  const Text('Qualification', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  _InfoRow(icon: Icons.school, text: doctor.qualification),
                  if (doctor.languages != null)
                    _InfoRow(icon: Icons.language, text: 'Languages: ${doctor.languages}'),

                  const SizedBox(height: 20),

                  // Consultation options
                  const Text('Consultation Options', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      if (doctor.videoConsultation)
                        _ConsultOption(icon: Icons.videocam, label: 'Video', color: Colors.blue),
                      if (doctor.chatConsultation)
                        _ConsultOption(icon: Icons.chat, label: 'Chat', color: Colors.green),
                      if (doctor.inClinic)
                        _ConsultOption(icon: Icons.local_hospital, label: 'In-Clinic', color: Colors.orange),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Fee info
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Consultation Fee', style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
                          ],
                        ),
                        Text('₹${doctor.consultationFee.toInt()}',
                            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.primary)),
                      ],
                    ),
                  ),

                  const SizedBox(height: 80), // Padding for bottom button
                ],
              ),
            ),
          ),
        ],
      ),

      // Book appointment button
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          boxShadow: [BoxShadow(color: AppColors.cardShadow, blurRadius: 10, offset: const Offset(0, -2))],
        ),
        child: SizedBox(
          height: 52,
          child: ElevatedButton(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => BookAppointmentScreen(doctor: doctor)),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Book Appointment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          ),
        ),
      ),
    );
  }
}

/// Stat card widget for experience, rating, patients, reviews display
class _StatCard extends StatelessWidget {
  final String value;
  final String label;
  final IconData? icon;

  const _StatCard({required this.value, required this.label, this.icon});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [BoxShadow(color: AppColors.cardShadow, blurRadius: 4)],
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) Icon(icon, size: 16, color: AppColors.warning),
                Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary)),
              ],
            ),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }
}

/// Info row with icon for qualification and language display
class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;

  const _InfoRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.primary),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 14))),
        ],
      ),
    );
  }
}

/// Consultation type option chip
class _ConsultOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _ConsultOption({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
