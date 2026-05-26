/// Book Appointment Screen - Multi-step appointment booking flow.
/// Step 1: Select consultation type -> Step 2: Pick date/time -> Step 3: Confirm.

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/doctor_model.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';

class BookAppointmentScreen extends StatefulWidget {
  final DoctorModel doctor;
  const BookAppointmentScreen({super.key, required this.doctor});

  @override
  State<BookAppointmentScreen> createState() => _BookAppointmentScreenState();
}

class _BookAppointmentScreenState extends State<BookAppointmentScreen> {
  final _api = ApiService();
  int _currentStep = 0;
  String _consultationType = 'video';
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  String _selectedTime = '10:00';
  final _reasonController = TextEditingController();
  final _symptomsController = TextEditingController();
  bool _isBooking = false;

  // Available time slots for the selected date
  final List<String> _timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  ];

  @override
  void dispose() {
    _reasonController.dispose();
    _symptomsController.dispose();
    super.dispose();
  }

  /// Submit appointment booking to the API
  Future<void> _bookAppointment() async {
    setState(() => _isBooking = true);
    try {
      await _api.post('/appointments/', body: {
        'doctor_id': widget.doctor.id,
        'appointment_date': _selectedDate.toIso8601String(),
        'slot_time': _selectedTime,
        'consultation_type': _consultationType,
        'reason': _reasonController.text,
        'symptoms': _symptomsController.text,
      });

      if (mounted) {
        // Show success dialog
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle, color: AppColors.success, size: 64),
                const SizedBox(height: 16),
                const Text('Appointment Booked!',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(
                  '${widget.doctor.fullName}\n${DateFormat('EEEE, MMM d').format(_selectedDate)} at $_selectedTime',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context); // Close dialog
                      Navigator.pop(context); // Back to doctor profile
                      Navigator.pop(context); // Back to search
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Done'),
                  ),
                ),
              ],
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Booking failed: ${e.toString()}')),
        );
      }
    }
    setState(() => _isBooking = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Book Appointment'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Stepper(
        currentStep: _currentStep,
        onStepContinue: () {
          if (_currentStep < 2) {
            setState(() => _currentStep++);
          } else {
            _bookAppointment();
          }
        },
        onStepCancel: () {
          if (_currentStep > 0) setState(() => _currentStep--);
        },
        controlsBuilder: (context, details) {
          return Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isBooking ? null : details.onStepContinue,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: _isBooking && _currentStep == 2
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text(_currentStep == 2 ? 'Confirm Booking' : 'Next'),
                  ),
                ),
                if (_currentStep > 0) ...[
                  const SizedBox(width: 12),
                  TextButton(onPressed: details.onStepCancel, child: const Text('Back')),
                ],
              ],
            ),
          );
        },
        steps: [
          // Step 1: Consultation Type
          Step(
            title: const Text('Consultation Type'),
            isActive: _currentStep >= 0,
            state: _currentStep > 0 ? StepState.complete : StepState.indexed,
            content: Column(
              children: [
                _TypeOption(
                  icon: Icons.videocam, label: 'Video Consultation', subtitle: 'Consult via video call',
                  isSelected: _consultationType == 'video',
                  onTap: () => setState(() => _consultationType = 'video'),
                ),
                _TypeOption(
                  icon: Icons.chat, label: 'Chat Consultation', subtitle: 'Text-based consultation',
                  isSelected: _consultationType == 'chat',
                  onTap: () => setState(() => _consultationType = 'chat'),
                ),
                _TypeOption(
                  icon: Icons.local_hospital, label: 'In-Clinic Visit', subtitle: 'Visit doctor at clinic',
                  isSelected: _consultationType == 'in_clinic',
                  onTap: () => setState(() => _consultationType = 'in_clinic'),
                ),
              ],
            ),
          ),

          // Step 2: Date & Time
          Step(
            title: const Text('Select Date & Time'),
            isActive: _currentStep >= 1,
            state: _currentStep > 1 ? StepState.complete : StepState.indexed,
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Date picker
                GestureDetector(
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: _selectedDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 30)),
                    );
                    if (date != null) setState(() => _selectedDate = date);
                  },
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.divider),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.calendar_today, color: AppColors.primary),
                        const SizedBox(width: 12),
                        Text(DateFormat('EEEE, MMMM d, yyyy').format(_selectedDate),
                            style: const TextStyle(fontSize: 15)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Available Slots', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _timeSlots.map((time) => ChoiceChip(
                    label: Text(time),
                    selected: _selectedTime == time,
                    onSelected: (selected) => setState(() => _selectedTime = time),
                    selectedColor: AppColors.primary,
                    labelStyle: TextStyle(color: _selectedTime == time ? Colors.white : AppColors.textPrimary),
                  )).toList(),
                ),
              ],
            ),
          ),

          // Step 3: Confirmation
          Step(
            title: const Text('Confirm Details'),
            isActive: _currentStep >= 2,
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Reason for visit
                TextField(
                  controller: _reasonController,
                  decoration: InputDecoration(
                    labelText: 'Reason for visit',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: AppColors.surface,
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _symptomsController,
                  decoration: InputDecoration(
                    labelText: 'Symptoms (optional)',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: AppColors.surface,
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 16),

                // Booking summary
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      _SummaryRow('Doctor', widget.doctor.fullName ?? 'Doctor'),
                      _SummaryRow('Specialization', widget.doctor.primarySpecialization),
                      _SummaryRow('Type', _consultationType.replaceAll('_', ' ').toUpperCase()),
                      _SummaryRow('Date', DateFormat('EEEE, MMM d, yyyy').format(_selectedDate)),
                      _SummaryRow('Time', _selectedTime),
                      const Divider(),
                      _SummaryRow('Fee', '₹${widget.doctor.consultationFee.toInt()}', isBold: true),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Consultation type selection option card
class _TypeOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final bool isSelected;
  final VoidCallback onTap;

  const _TypeOption({
    required this.icon, required this.label, required this.subtitle,
    required this.isSelected, required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withOpacity(0.1) : AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? AppColors.primary : AppColors.divider, width: 2),
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? AppColors.primary : AppColors.textSecondary),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: isSelected ? AppColors.primary : AppColors.textPrimary)),
                Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              ],
            ),
            const Spacer(),
            if (isSelected) const Icon(Icons.check_circle, color: AppColors.primary),
          ],
        ),
      ),
    );
  }
}

/// Booking summary row widget
class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isBold;

  const _SummaryRow(this.label, this.value, {this.isBold = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary)),
          Text(value, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.w500)),
        ],
      ),
    );
  }
}
