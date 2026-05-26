/// Doctor Search Screen - Search and filter doctors by specialization,
/// city, rating, and fee. Shows doctor cards with booking action.

import 'package:flutter/material.dart';
import '../../models/doctor_model.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';
import 'doctor_profile_screen.dart';

class DoctorSearchScreen extends StatefulWidget {
  const DoctorSearchScreen({super.key});

  @override
  State<DoctorSearchScreen> createState() => _DoctorSearchScreenState();
}

class _DoctorSearchScreenState extends State<DoctorSearchScreen> {
  final _searchController = TextEditingController();
  final _api = ApiService();
  List<DoctorModel> _doctors = [];
  bool _isLoading = true;
  String? _selectedSpecialization;

  // Available specialization filters
  final List<String> _specializations = [
    'All', 'General Medicine', 'Cardiology', 'Dermatology',
    'Orthopedics', 'Pediatrics', 'Neurology', 'ENT',
  ];

  @override
  void initState() {
    super.initState();
    _loadDoctors();
  }

  /// Fetch doctors from API with optional search filters
  Future<void> _loadDoctors({String? name, String? specialization}) async {
    setState(() => _isLoading = true);
    try {
      String endpoint = '/doctors/search?';
      if (name != null && name.isNotEmpty) endpoint += 'name=$name&';
      if (specialization != null && specialization != 'All') endpoint += 'specialization=$specialization&';

      final response = await _api.get(endpoint);
      setState(() {
        _doctors = (response as List).map((d) => DoctorModel.fromJson(d)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Find Doctors'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Search header
          Container(
            padding: const EdgeInsets.all(16),
            color: AppColors.primary,
            child: TextField(
              controller: _searchController,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Search by doctor name...',
                hintStyle: const TextStyle(color: Colors.white60),
                prefixIcon: const Icon(Icons.search, color: Colors.white70),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: Colors.white70),
                        onPressed: () {
                          _searchController.clear();
                          _loadDoctors();
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.white24,
              ),
              onSubmitted: (value) => _loadDoctors(name: value),
            ),
          ),

          // Specialization filter chips
          SizedBox(
            height: 50,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: _specializations.length,
              itemBuilder: (context, index) {
                final spec = _specializations[index];
                final isSelected = _selectedSpecialization == spec || (spec == 'All' && _selectedSpecialization == null);
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(spec, style: TextStyle(
                      color: isSelected ? Colors.white : AppColors.textPrimary,
                      fontSize: 12,
                    )),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() => _selectedSpecialization = spec == 'All' ? null : spec);
                      _loadDoctors(specialization: spec);
                    },
                    backgroundColor: AppColors.surface,
                    selectedColor: AppColors.primary,
                    checkmarkColor: Colors.white,
                  ),
                );
              },
            ),
          ),

          // Doctor list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _doctors.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.search_off, size: 64, color: AppColors.textLight),
                            SizedBox(height: 16),
                            Text('No doctors found', style: TextStyle(fontSize: 16, color: AppColors.textSecondary)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _doctors.length,
                        itemBuilder: (context, index) => _DoctorCard(
                          doctor: _doctors[index],
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => DoctorProfileScreen(doctor: _doctors[index])),
                          ),
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

/// Doctor card widget showing key info with booking action
class _DoctorCard extends StatelessWidget {
  final DoctorModel doctor;
  final VoidCallback onTap;

  const _DoctorCard({required this.doctor, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: AppColors.cardShadow, blurRadius: 6, offset: const Offset(0, 2))],
        ),
        child: Row(
          children: [
            // Doctor avatar
            CircleAvatar(
              radius: 30,
              backgroundColor: AppColors.primaryLight,
              child: Text(
                (doctor.fullName ?? 'D')[0],
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
            ),
            const SizedBox(width: 14),

            // Doctor info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(doctor.fullName ?? 'Doctor',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(doctor.primarySpecialization,
                      style: const TextStyle(fontSize: 13, color: AppColors.primary)),
                  const SizedBox(height: 2),
                  Text('${doctor.experienceYears} yrs exp • ${doctor.hospitalName ?? ""}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      // Rating
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.success.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.star, size: 14, color: AppColors.success),
                            const SizedBox(width: 2),
                            Text('${doctor.rating}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.success)),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text('${doctor.totalReviews} reviews', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                      const Spacer(),
                      // Fee
                      Text('₹${doctor.consultationFee.toInt()}',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
