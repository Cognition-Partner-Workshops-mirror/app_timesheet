/// Auth Provider - State management for user authentication.
/// Manages login state, user data, and role-based navigation.

import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();

  UserModel? _user;
  bool _isLoading = false;
  String? _error;

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isLoggedIn => _user != null;
  String get userRole => _user?.role ?? 'patient';

  /// Initialize auth state from stored data on app startup
  Future<void> init() async {
    _isLoading = true;
    notifyListeners();
    try {
      _user = await _authService.getStoredUser();
    } catch (e) {
      _user = null;
    }
    _isLoading = false;
    notifyListeners();
  }

  /// Register a new user
  Future<bool> register({
    required String email,
    required String password,
    required String fullName,
    String? phone,
    String role = 'patient',
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _user = await _authService.register(
        email: email,
        password: password,
        fullName: fullName,
        phone: phone,
        role: role,
      );
      _isLoading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Connection error. Please try again.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Login with credentials
  Future<bool> login({required String email, required String password}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _user = await _authService.login(email: email, password: password);
      _isLoading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Connection error. Please try again.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Logout and clear session
  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    notifyListeners();
  }

  /// Clear any displayed error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
