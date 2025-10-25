// src/app.d.ts
// Extend the Locals interface to include userRoles

declare namespace App {
  interface Locals {
    userRoles: string[];
  }
}