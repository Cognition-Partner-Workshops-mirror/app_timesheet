/// Doctor Home Dashboard - Main screen for doctor users.
/// Shows today's schedule, patient queue, earnings, and quick actions.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';
import '../../models/appointment_model.dart';

class DoctorHomeScreen extends StatefulWidget {
  const DoctorHomeScreen({super.key});

  @override
  State<DoctorHomeScreen> createState() => _DoctorHomeScreenState();
}

class _DoctorHomeScreenState extends State<DoctorHomeScreen> {
  final _api = ApiService();
  List<AppointmentModel> _todayAppointments = [];
  bool _isLoading = true;
  int _currentNavIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadTodayAppointments();
  }

  Future<void> _loadTodayAppointments() async {
    try {
      final response = await _api.get('/appointments/my');
      setState(() {
        _todayAppointments = (response as List).map((a) => AppointmentModel.fromJson(a)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user;
    final pending = _todayAppointments.where((a) => a.status == 'pending').length;
    final confirmed = _todayAppointments.where((a) => a.status == 'confirmed').length;
    final completed = _todayAppointments.where((a) => a.status == 'completed').length;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Doctor header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: [Color(0xFF1565C0), AppColors.primaryDark]),
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(24),
                    bottomRight: Radius.circular(24),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${user?.fullName ?? 'Doctor'} 👨‍⚕️',
                                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            const Text('Welcome back!', style: TextStyle(color: Colors.white70, fontSize: 14)),
                          ],
                        ),
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.notifications_outlined, color: Colors.white),
                              onPressed: () {},
                            ),
                            GestureDetector(
                              onTap: () => _showDoctorMenu(context),
                              child: CircleAvatar(
                                radius: 22,
                                backgroundColor: Colors.white24,
                                child: Text((user?.fullName ?? 'D')[0],
                                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    // Stats row
                    Row(
                      children: [
                        _StatBadge(value: '$pending', label: 'Pending', color: AppColors.warning),
                        _StatBadge(value: '$confirmed', label: 'Confirmed', color: AppColors.primary),
                        _StatBadge(value: '$completed', label: 'Completed', color: AppColors.success),
                        _StatBadge(value: '${_todayAppointments.length}', label: 'Total', color: Colors.white),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Quick actions
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    _ActionCard(icon: Icons.calendar_today, label: 'Schedule', color: AppColors.primary, onTap: () {}),
                    const SizedBox(width: 12),
                    _ActionCard(icon: Icons.people, label: 'Patients', color: AppColors.accent, onTap: () {}),
                    const SizedBox(width: 12),
                    _ActionCard(icon: Icons.description, label: 'Prescriptions', color: Colors.orange, onTap: () {}),
                    const SizedBox(width: 12),
                    _ActionCard(icon: Icons.account_balance_wallet, label: 'Earnings', color: Colors.purple, onTap: () {}),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Today's appointments
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Today's Appointments", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    TextButton(onPressed: () {}, child: const Text('View All')),
                  ],
                ),
              ),

              _isLoading
                  ? const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()))
                  : _todayAppointments.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.all(40),
                          child: Center(
                            child: Column(
                              children: [
                                Icon(Icons.event_available, size: 64, color: AppColors.textLight),
                                SizedBox(height: 12),
                                Text('No appointments scheduled', style: TextStyle(color: AppColors.textSecondary)),
                              ],
                            ),
                          ),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          itemCount: _todayAppointments.length,
                          itemBuilder: (context, index) {
                            final apt = _todayAppointments[index];
                            return _AppointmentCard(appointment: apt, api: _api, onUpdate: _loadTodayAppointments);
                          },
                        ),

              const SizedBox(height: 80),
            ],
          ),
        ),
      ),

      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentNavIndex,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textSecondary,
        onTap: (i) => setState(() => _currentNavIndex = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_today), label: 'Schedule'),
          BottomNavigationBarItem(icon: Icon(Icons.people), label: 'Patients'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }

  void _showDoctorMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.person), title: const Text('My Profile'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.settings), title: const Text('Settings'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.logout, color: AppColors.error),
              title: const Text('Logout', style: TextStyle(color: AppColors.error)),
              onTap: () {
                Provider.of<AuthProvider>(context, listen: false).logout();
                Navigator.of(context).pushReplacementNamed('/login');
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// Stat badge in the doctor header
class _StatBadge extends StatelessWidget {
  final String value;
  final String label;
  final Color color;
  const _StatBadge({required this.value, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(fontSize: 11, color: color.withOpacity(0.8))),
          ],
        ),
      ),
    );
  }
}

/// Quick action card for the doctor dashboard
class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _ActionCard({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(14)),
          child: Column(
            children: [
              Icon(icon, color: color, size: 26),
              const SizedBox(height: 6),
              Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Appointment card with accept/complete actions for doctors
class _AppointmentCard extends StatelessWidget {
  final AppointmentModel appointment;
  final ApiService api;
  final VoidCallback onUpdate;
  const _AppointmentCard({required this.appointment, required this.api, required this.onUpdate});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [BoxShadow(color: AppColors.cardShadow, blurRadius: 4)],
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: AppColors.accentLight,
                child: Text((appointment.patientName ?? 'P')[0],
                    style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(appointment.patientName ?? 'Patient',
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    Text('${appointment.slotTime} • ${appointment.consultationType}',
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                  ],
                ),
              ),
              if (appointment.status == 'pending')
                ElevatedButton(
                  onPressed: () async {
                    await api.put('/appointments/${appointment.id}', body: {'status': 'confirmed'});
                    onUpdate();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(80, 36),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Accept', style: TextStyle(fontSize: 13)),
                ),
              if (appointment.status == 'confirmed')
                ElevatedButton(
                  onPressed: () async {
                    await api.put('/appointments/${appointment.id}', body: {'status': 'completed'});
                    onUpdate();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(80, 36),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Complete', style: TextStyle(fontSize: 13)),
                ),
            ],
          ),
          if (appointment.reason != null && appointment.reason!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text('Reason: ${appointment.reason}',
                style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          ],
        ],
      ),
    );
  }
}
