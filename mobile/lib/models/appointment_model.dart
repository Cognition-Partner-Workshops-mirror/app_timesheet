/// Appointment Model - Represents booking data between patient and doctor.

class AppointmentModel {
  final int id;
  final int patientId;
  final int doctorId;
  final String? patientName;
  final String? doctorName;
  final String? doctorSpecialization;
  final String appointmentDate;
  final String slotTime;
  final int duration;
  final String consultationType;
  final String status;
  final String? reason;
  final String? symptoms;
  final double? fee;
  final String? doctorNotes;
  final String? createdAt;

  AppointmentModel({
    required this.id,
    required this.patientId,
    required this.doctorId,
    this.patientName,
    this.doctorName,
    this.doctorSpecialization,
    required this.appointmentDate,
    required this.slotTime,
    this.duration = 30,
    required this.consultationType,
    required this.status,
    this.reason,
    this.symptoms,
    this.fee,
    this.doctorNotes,
    this.createdAt,
  });

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    return AppointmentModel(
      id: json['id'],
      patientId: json['patient_id'],
      doctorId: json['doctor_id'],
      patientName: json['patient_name'],
      doctorName: json['doctor_name'],
      doctorSpecialization: json['doctor_specialization'],
      appointmentDate: json['appointment_date'],
      slotTime: json['slot_time'],
      duration: json['duration'] ?? 30,
      consultationType: json['consultation_type'],
      status: json['status'],
      reason: json['reason'],
      symptoms: json['symptoms'],
      fee: json['fee'] != null ? (json['fee'] as num).toDouble() : null,
      doctorNotes: json['doctor_notes'],
      createdAt: json['created_at'],
    );
  }

  /// Get status display color name
  String get statusDisplay {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }
}
