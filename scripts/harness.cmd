@echo off
rem Wrapper so the harness can be run from cmd.exe, Explorer, or any shell.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0harness.ps1" %*
