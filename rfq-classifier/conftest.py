"""
Pytest configuration and shared fixtures.
Adds the project root to sys.path so imports work correctly.
"""

import os
import sys

# Add project root to Python path so 'shared', 'agents' etc. are importable
sys.path.insert(0, os.path.dirname(__file__))
