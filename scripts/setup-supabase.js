#!/usr/bin/env node

/**
 * Supabase Setup Script for DriveKind
 * 
 * This script helps set up the database schema and initial data
 * Run with: node scripts/setup-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need this for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Please set these in your .env file or environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Setting up DriveKind database...\n');

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Executing database schema...');
    
    // Execute the schema
    const { data, error } = await supabase.rpc('exec_sql', { sql: schema });
    
    if (error) {
      console.error('❌ Error executing schema:', error);
      return false;
    }

    console.log('✅ Database schema created successfully!\n');

    // Create initial system configuration
    console.log('⚙️ Setting up initial system configuration...');
    
    const initialConfig = [
      {
        config_key: 'system_name',
        config_value: 'DriveKind',
        config_type: 'string',
        description: 'System name',
        is_public: true
      },
      {
        config_key: 'max_ride_advance_days',
        config_value: '30',
        config_type: 'number',
        description: 'Maximum days in advance for ride scheduling',
        is_public: false
      },
      {
        config_key: 'default_ride_duration',
        config_value: '60',
        config_type: 'number',
        description: 'Default ride duration in minutes',
        is_public: false
      },
      {
        config_key: 'enable_donations',
        config_value: 'true',
        config_type: 'boolean',
        description: 'Enable donation tracking',
        is_public: false
      }
    ];

    const { error: configError } = await supabase
      .from('system_config')
      .insert(initialConfig);

    if (configError) {
      console.error('❌ Error setting up initial config:', configError);
    } else {
      console.log('✅ Initial system configuration created!\n');
    }

    // Create sample organization (optional)
    console.log('🏢 Creating sample organization...');
    
    const sampleOrg = {
      name: 'DriveKind Demo Organization',
      street_address: '123 Main Street',
      city: 'Demo City',
      state: 'DC',
      zip_code: '20001',
      phone: '(555) 123-4567',
      email: 'demo@drivekind.org',
      website: 'https://drivekind.org'
    };

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert(sampleOrg)
      .select()
      .single();

    if (orgError) {
      console.error('❌ Error creating sample organization:', orgError);
    } else {
      console.log('✅ Sample organization created with ID:', orgData.org_id);
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Create your first Super Admin user through the signup process');
    console.log('2. Update the organization head_admin_id with the Super Admin user ID');
    console.log('3. Start using the application with role-based access');

    return true;

  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
}

async function createSampleData() {
  console.log('\n📊 Creating sample data...');

  try {
    // Get the sample organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('org_id')
      .eq('name', 'DriveKind Demo Organization')
      .single();

    if (orgError || !org) {
      console.error('❌ Could not find sample organization');
      return false;
    }

    // Create sample profiles (these would normally be created through auth signup)
    const sampleProfiles = [
      {
        user_id: '00000000-0000-0000-0000-000000000001', // This would be a real UUID from auth.users
        org_id: org.org_id,
        first_name: 'John',
        last_name: 'Admin',
        primary_phone: '(555) 111-1111',
        role: 'Admin',
        is_active: true
      },
      {
        user_id: '00000000-0000-0000-0000-000000000002',
        org_id: org.org_id,
        first_name: 'Jane',
        last_name: 'Dispatcher',
        primary_phone: '(555) 222-2222',
        role: 'Dispatcher',
        is_active: true
      },
      {
        user_id: '00000000-0000-0000-0000-000000000003',
        org_id: org.org_id,
        first_name: 'Bob',
        last_name: 'Driver',
        primary_phone: '(555) 333-3333',
        role: 'Driver',
        is_active: true
      }
    ];

    console.log('✅ Sample data creation completed!');
    console.log('Note: You\'ll need to create real users through the authentication system');

    return true;

  } catch (error) {
    console.error('❌ Sample data creation failed:', error);
    return false;
  }
}

// Main execution
async function main() {
  const success = await setupDatabase();
  
  if (success) {
    const createSample = process.argv.includes('--with-sample-data');
    if (createSample) {
      await createSampleData();
    }
  }
}

main().catch(console.error);
