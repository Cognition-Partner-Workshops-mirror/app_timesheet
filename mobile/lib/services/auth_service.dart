/// Authentication Service
/// Handles user login, registration, token management, and session state.

import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _api = ApiService();

  /// Register a new user account
  Future<UserModel> register({
    required String email,
    required String password,
    required String fullName,
    String? phone,
    String role = 'patient',
  }) async {
    final response = await _api.post('/auth/register', body: {
      'email': email,
      'password': password,
      'full_name': fullName,
      'phone': phone,
      'role': role,
    }, requireAuth: false);

    // Save tokens from response
    await _api.saveTokens(response['access_token'], response['refresh_token']);

    // Save user data locally
    final user = UserModel.fromJson(response['user']);
    await _saveUserLocally(user);
    return user;
  }

  /// Login with email and password
  Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    final response = await _api.post('/auth/login', body: {
      'email': email,
      'password': password,
    }, requireAuth: false);

    // Save tokens from response
    await _api.saveTokens(response['access_token'], response['refresh_token']);

    // Save user data locally
    final user = UserModel.fromJson(response['user']);
    await _saveUserLocally(user);
    return user;
  }

  /// Get current user profile from API
  Future<UserModel> getProfile() async {
    final response = await _api.get('/auth/me');
    return UserModel.fromJson(response);
  }

  /// Logout - clear all stored tokens and user data
  Future<void> logout() async {
    await _api.clearTokens();
  }

  /// Check if user is logged in by checking for stored token
  Future<bool> isLoggedIn() async {
    final token = await _api.accessToken;
    return token != null;
  }

  /// Get locally stored user data for fast startup
  Future<UserModel?> getStoredUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userData = prefs.getString('user_data');
    if (userData != null) {
      return UserModel.fromJson(jsonDecode(userData));
    }
    return null;
  }

  /// Save user data to local storage
  Future<void> _saveUserLocally(UserModel user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user_data', jsonEncode({
      'id': user.id,
      'email': user.email,
      'full_name': user.fullName,
      'phone': user.phone,
      'role': user.role,
      'gender': user.gender,
      'avatar_url': user.avatarUrl,
      'city': user.city,
      'state': user.state,
      'is_active': user.isActive,
      'is_verified': user.isVerified,
    }));
  }
}
