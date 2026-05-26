/// AI Symptom Checker Screen - Chat-style interface for symptom analysis.
/// Uses OpenAI-powered triage to assess urgency and recommend specialists.

import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';

class AISymptomCheckerScreen extends StatefulWidget {
  const AISymptomCheckerScreen({super.key});

  @override
  State<AISymptomCheckerScreen> createState() => _AISymptomCheckerScreenState();
}

class _AISymptomCheckerScreenState extends State<AISymptomCheckerScreen> {
  final _api = ApiService();
  final _symptomsController = TextEditingController();
  final _ageController = TextEditingController();
  String? _selectedGender;
  final _durationController = TextEditingController();
  bool _isAnalyzing = false;
  Map<String, dynamic>? _result;

  /// Send symptoms to AI triage API
  Future<void> _analyzeSymptoms() async {
    if (_symptomsController.text.isEmpty) return;

    setState(() {
      _isAnalyzing = true;
      _result = null;
    });

    try {
      final response = await _api.post('/ai/symptom-check', body: {
        'symptoms': _symptomsController.text,
        'age': _ageController.text.isNotEmpty ? int.tryParse(_ageController.text) : null,
        'gender': _selectedGender,
        'duration': _durationController.text,
      });
      setState(() {
        _result = response;
        _isAnalyzing = false;
      });
    } catch (e) {
      setState(() => _isAnalyzing = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Analysis failed: ${e.toString()}')),
        );
      }
    }
  }

  /// Get color based on urgency level from AI triage
  Color _getUrgencyColor(String level) {
    switch (level) {
      case 'emergency':
        return AppColors.emergency;
      case 'urgent':
        return AppColors.urgent;
      case 'routine':
        return AppColors.routine;
      case 'self_care':
        return AppColors.selfCare;
      default:
        return AppColors.textSecondary;
    }
  }

  @override
  void dispose() {
    _symptomsController.dispose();
    _ageController.dispose();
    _durationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('AI Symptom Checker'),
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // AI assistant header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.accent.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Row(
                children: [
                  Icon(Icons.smart_toy, size: 40, color: AppColors.accent),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('AI Health Assistant', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        SizedBox(height: 4),
                        Text('Describe your symptoms and I\'ll help assess the urgency and recommend the right specialist.',
                            style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Symptoms input
            const Text('What symptoms are you experiencing?',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _symptomsController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'E.g., I have a headache, fever, and body ache since 2 days...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: AppColors.surface,
              ),
            ),

            const SizedBox(height: 16),

            // Additional info row - Age and Gender
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ageController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'Age',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: AppColors.surface,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedGender,
                    decoration: InputDecoration(
                      labelText: 'Gender',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: AppColors.surface,
                    ),
                    items: ['male', 'female', 'other'].map((g) => DropdownMenuItem(
                      value: g,
                      child: Text(g[0].toUpperCase() + g.substring(1)),
                    )).toList(),
                    onChanged: (v) => setState(() => _selectedGender = v),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Duration input
            TextField(
              controller: _durationController,
              decoration: InputDecoration(
                labelText: 'How long have you had these symptoms?',
                hintText: 'E.g., 2 days, 1 week',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: AppColors.surface,
              ),
            ),

            const SizedBox(height: 20),

            // Analyze button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _isAnalyzing ? null : _analyzeSymptoms,
                icon: _isAnalyzing
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.analytics),
                label: Text(_isAnalyzing ? 'Analyzing...' : 'Check Symptoms'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Results section
            if (_result != null) ...[
              // Urgency badge
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _getUrgencyColor(_result!['urgency_level']).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: _getUrgencyColor(_result!['urgency_level']).withOpacity(0.3)),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: _getUrgencyColor(_result!['urgency_level']),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            (_result!['urgency_level'] as String).toUpperCase().replaceAll('_', ' '),
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ),
                        const Spacer(),
                        Text('Risk: ${((_result!['risk_score'] ?? 0) * 100).toInt()}%',
                            style: TextStyle(fontWeight: FontWeight.bold, color: _getUrgencyColor(_result!['urgency_level']))),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(_result!['recommended_action'] ?? '',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Recommended speciality
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [BoxShadow(color: AppColors.cardShadow, blurRadius: 4)],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.medical_services, color: AppColors.primary),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Recommended Specialist', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        Text(_result!['recommended_speciality'] ?? 'General Medicine',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Possible conditions
              if (_result!['possible_conditions'] != null)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Possible Conditions', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ...(_result!['possible_conditions'] as List).map((c) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(c['condition'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                                  const Spacer(),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(c['probability'] ?? '', style: const TextStyle(fontSize: 11, color: AppColors.primary)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(c['description'] ?? '', style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                            ],
                          ),
                        )),
                  ],
                ),

              const SizedBox(height: 16),

              // Disclaimer
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.warning.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: AppColors.warning, size: 20),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'This is AI-assisted triage only. Please consult a qualified doctor for proper diagnosis.',
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Book doctor button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Find a Doctor'),
                ),
              ),
            ],

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
