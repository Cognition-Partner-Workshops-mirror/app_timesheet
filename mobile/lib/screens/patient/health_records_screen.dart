/// Health Records Screen - Patient medical records and vitals tracking.
/// Supports viewing records, adding vitals, and tracking health metrics.

import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';

class HealthRecordsScreen extends StatefulWidget {
  const HealthRecordsScreen({super.key});

  @override
  State<HealthRecordsScreen> createState() => _HealthRecordsScreenState();
}

class _HealthRecordsScreenState extends State<HealthRecordsScreen> {
  final _api = ApiService();
  List<dynamic> _records = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadRecords();
  }

  Future<void> _loadRecords() async {
    try {
      final response = await _api.get('/health-records/');
      setState(() {
        _records = response as List;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  /// Show dialog to add new vitals entry
  void _showAddVitalsDialog() {
    final bpSysController = TextEditingController();
    final bpDiaController = TextEditingController();
    final heartRateController = TextEditingController();
    final weightController = TextEditingController();
    final sugarController = TextEditingController();
    final tempController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Add Vitals', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(child: _VitalInput(controller: bpSysController, label: 'BP Systolic', hint: '120')),
                  const SizedBox(width: 12),
                  Expanded(child: _VitalInput(controller: bpDiaController, label: 'BP Diastolic', hint: '80')),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _VitalInput(controller: heartRateController, label: 'Heart Rate', hint: '72')),
                  const SizedBox(width: 12),
                  Expanded(child: _VitalInput(controller: tempController, label: 'Temp (°C)', hint: '36.6')),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _VitalInput(controller: weightController, label: 'Weight (kg)', hint: '70')),
                  const SizedBox(width: 12),
                  Expanded(child: _VitalInput(controller: sugarController, label: 'Blood Sugar', hint: '100')),
                ],
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () async {
                    try {
                      await _api.post('/health-records/vitals', body: {
                        'blood_pressure_systolic': int.tryParse(bpSysController.text),
                        'blood_pressure_diastolic': int.tryParse(bpDiaController.text),
                        'heart_rate': int.tryParse(heartRateController.text),
                        'temperature': double.tryParse(tempController.text),
                        'weight': double.tryParse(weightController.text),
                        'blood_sugar': double.tryParse(sugarController.text),
                      });
                      if (context.mounted) Navigator.pop(context);
                      _loadRecords();
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Failed to save: $e')),
                        );
                      }
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Save Vitals'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Get icon for record type
  IconData _getRecordIcon(String type) {
    switch (type) {
      case 'vitals': return Icons.favorite;
      case 'lab_report': return Icons.science;
      case 'prescription': return Icons.description;
      case 'scan': return Icons.image;
      default: return Icons.folder;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Health Records'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _records.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.folder_open, size: 64, color: AppColors.textLight),
                      const SizedBox(height: 16),
                      const Text('No health records yet', style: TextStyle(fontSize: 16, color: AppColors.textSecondary)),
                      const SizedBox(height: 8),
                      const Text('Start tracking your vitals', style: TextStyle(color: AppColors.textSecondary)),
                      const SizedBox(height: 20),
                      ElevatedButton.icon(
                        onPressed: _showAddVitalsDialog,
                        icon: const Icon(Icons.add),
                        label: const Text('Add Vitals'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadRecords,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _records.length,
                    itemBuilder: (context, index) {
                      final record = _records[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [BoxShadow(color: AppColors.cardShadow, blurRadius: 4)],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 40, height: 40,
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(_getRecordIcon(record['record_type'] ?? ''), color: AppColors.primary, size: 22),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(record['title'] ?? 'Record',
                                          style: const TextStyle(fontWeight: FontWeight.w600)),
                                      Text((record['record_type'] ?? '').toString().replaceAll('_', ' ').toUpperCase(),
                                          style: const TextStyle(fontSize: 12, color: AppColors.primary)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            // Show vitals if present
                            if (record['blood_pressure_systolic'] != null) ...[
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 12,
                                runSpacing: 8,
                                children: [
                                  if (record['blood_pressure_systolic'] != null)
                                    _VitalBadge('BP', '${record['blood_pressure_systolic']}/${record['blood_pressure_diastolic']}', Colors.red),
                                  if (record['heart_rate'] != null)
                                    _VitalBadge('HR', '${record['heart_rate']} bpm', Colors.pink),
                                  if (record['weight'] != null)
                                    _VitalBadge('Weight', '${record['weight']} kg', Colors.blue),
                                  if (record['blood_sugar'] != null)
                                    _VitalBadge('Sugar', '${record['blood_sugar']} mg/dL', Colors.orange),
                                  if (record['temperature'] != null)
                                    _VitalBadge('Temp', '${record['temperature']}°C', Colors.teal),
                                ],
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddVitalsDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}

/// Vitals input field widget for the add vitals dialog
class _VitalInput extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;

  const _VitalInput({required this.controller, required this.label, required this.hint});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.number,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
    );
  }
}

/// Vital sign badge widget for displaying health metrics
class _VitalBadge extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _VitalBadge(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
          Text(value, style: TextStyle(fontSize: 13, color: color, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
