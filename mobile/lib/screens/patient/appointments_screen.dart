/// Appointments Screen - Lists all patient appointments with status filtering.
/// Shows appointment cards with doctor info, time, and status badges.

import 'package:flutter/material.dart';
import '../../models/appointment_model.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> with SingleTickerProviderStateMixin {
  final _api = ApiService();
  late TabController _tabController;
  List<AppointmentModel> _appointments = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAppointments();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAppointments() async {
    try {
      final response = await _api.get('/appointments/my');
      setState(() {
        _appointments = (response as List).map((a) => AppointmentModel.fromJson(a)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  /// Filter appointments by status category
  List<AppointmentModel> _filterByStatus(String category) {
    switch (category) {
      case 'upcoming':
        return _appointments.where((a) => ['pending', 'confirmed'].contains(a.status)).toList();
      case 'completed':
        return _appointments.where((a) => a.status == 'completed').toList();
      case 'cancelled':
        return _appointments.where((a) => a.status == 'cancelled').toList();
      default:
        return _appointments;
    }
  }

  /// Get color for appointment status badge
  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending': return AppColors.warning;
      case 'confirmed': return AppColors.primary;
      case 'in_progress': return AppColors.accent;
      case 'completed': return AppColors.success;
      case 'cancelled': return AppColors.error;
      default: return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Appointments'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(text: 'Upcoming'),
            Tab(text: 'Completed'),
            Tab(text: 'Cancelled'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: ['upcoming', 'completed', 'cancelled'].map((category) {
                final filtered = _filterByStatus(category);
                if (filtered.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.calendar_today, size: 64, color: AppColors.textLight),
                        const SizedBox(height: 16),
                        Text('No $category appointments',
                            style: const TextStyle(fontSize: 16, color: AppColors.textSecondary)),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: _loadAppointments,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final apt = filtered[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [BoxShadow(color: AppColors.cardShadow, blurRadius: 6)],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  backgroundColor: AppColors.primaryLight,
                                  child: Text((apt.doctorName ?? 'D')[0],
                                      style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(apt.doctorName ?? 'Doctor',
                                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                                      if (apt.doctorSpecialization != null)
                                        Text(apt.doctorSpecialization!,
                                            style: const TextStyle(fontSize: 13, color: AppColors.primary)),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: _getStatusColor(apt.status).withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(apt.statusDisplay,
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _getStatusColor(apt.status))),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            const Divider(height: 1),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                const Icon(Icons.calendar_today, size: 16, color: AppColors.textSecondary),
                                const SizedBox(width: 6),
                                Text(apt.appointmentDate.split('T').first,
                                    style: const TextStyle(fontSize: 13)),
                                const SizedBox(width: 16),
                                const Icon(Icons.access_time, size: 16, color: AppColors.textSecondary),
                                const SizedBox(width: 6),
                                Text(apt.slotTime, style: const TextStyle(fontSize: 13)),
                                const SizedBox(width: 16),
                                Icon(
                                  apt.consultationType == 'video' ? Icons.videocam : Icons.chat,
                                  size: 16, color: AppColors.textSecondary,
                                ),
                                const SizedBox(width: 6),
                                Text(apt.consultationType.replaceAll('_', ' '),
                                    style: const TextStyle(fontSize: 13)),
                              ],
                            ),
                            if (apt.fee != null) ...[
                              const SizedBox(height: 8),
                              Text('Fee: ₹${apt.fee!.toInt()}',
                                  style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.primary)),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
                );
              }).toList(),
            ),
    );
  }
}
