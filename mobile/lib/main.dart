/// CareAI Mobile Application Entry Point
/// AI-Powered Healthcare Platform - Flutter Mobile App
/// Supports Patient and Doctor roles with role-based navigation.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/patient/patient_home_screen.dart';
import 'screens/doctor/doctor_home_screen.dart';
import 'utils/constants.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CareAIApp());
}

class CareAIApp extends StatelessWidget {
  const CareAIApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      // AuthProvider manages login state and user data
      create: (_) => AuthProvider()..init(),
      child: MaterialApp(
        title: 'CareAI',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: AppColors.primary,
            primary: AppColors.primary,
            secondary: AppColors.accent,
            surface: AppColors.surface,
            error: AppColors.error,
          ),
          scaffoldBackgroundColor: AppColors.background,
          appBarTheme: const AppBarTheme(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            elevation: 0,
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          inputDecorationTheme: InputDecorationTheme(
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            filled: true,
            fillColor: AppColors.surface,
          ),
          useMaterial3: true,
        ),

        // Route definitions
        routes: {
          '/login': (context) => const LoginScreen(),
          '/home': (context) => const _HomeRouter(),
        },

        // Root widget - checks auth state and routes accordingly
        home: Consumer<AuthProvider>(
          builder: (context, auth, _) {
            if (auth.isLoading) {
              return const _SplashScreen();
            }
            if (auth.isLoggedIn) {
              return const _HomeRouter();
            }
            return const LoginScreen();
          },
        ),
      ),
    );
  }
}

/// Home Router - Directs user to the correct dashboard based on their role
class _HomeRouter extends StatelessWidget {
  const _HomeRouter();

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final role = auth.user?.role ?? 'patient';

    switch (role) {
      case 'doctor':
        return const DoctorHomeScreen();
      case 'admin':
        // Admin users are redirected to web portal
        return const _AdminRedirectScreen();
      default:
        return const PatientHomeScreen();
    }
  }
}

/// Splash Screen - Shown during initial auth check
class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primary,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(Icons.local_hospital, size: 60, color: AppColors.primary),
            ),
            const SizedBox(height: 24),
            const Text('CareAI',
                style: TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: Colors.white)),
            const SizedBox(height: 8),
            const Text('AI-Powered Healthcare',
                style: TextStyle(fontSize: 16, color: Colors.white70)),
            const SizedBox(height: 40),
            const CircularProgressIndicator(color: Colors.white),
          ],
        ),
      ),
    );
  }
}

/// Admin Redirect Screen - Tells admin users to use the web portal
class _AdminRedirectScreen extends StatelessWidget {
  const _AdminRedirectScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.admin_panel_settings, size: 80, color: AppColors.primary),
              const SizedBox(height: 24),
              const Text('Admin Portal', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              const Text(
                'The admin dashboard is available on the web portal. Please access it from a desktop browser.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 15),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () {
                  Provider.of<AuthProvider>(context, listen: false).logout();
                  Navigator.of(context).pushReplacementNamed('/login');
                },
                child: const Text('Logout'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
