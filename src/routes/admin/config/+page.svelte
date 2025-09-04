<!-- src/routes/admin/config/+page.svelte -->
<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { Settings, Save, RotateCcw, Shield, Bell, Database, Globe } from '@lucide/svelte';
	
	let systemSettings = $state({
		siteName: 'DriveKind',
		siteDescription: 'Accessible Transportation Services',
		timezone: 'UTC',
		language: 'en',
		maintenanceMode: false
	});
	
	let securitySettings = $state({
		requireMFA: true,
		sessionTimeout: 30,
		maxLoginAttempts: 5,
		passwordMinLength: 8
	});
	
	let notificationSettings = $state({
		emailNotifications: true,
		smsNotifications: false,
		pushNotifications: true,
		adminAlerts: true
	});
	
	let databaseSettings = $state({
		backupFrequency: 'daily',
		retentionDays: 30,
		compression: true,
		encryption: true
	});
	
	let showSaveModal = $state(false);
	let showResetModal = $state(false);
	
	function saveSettings() {
		showSaveModal = true;
		setTimeout(() => {
			showSaveModal = false;
		}, 2000);
	}
	
	function resetSettings() {
		showResetModal = true;
		setTimeout(() => {
			showResetModal = false;
		}, 2000);
	}
</script>

<RoleGuard requiredRoles={['Admin']}>
	<div class="min-h-screen bg-gray-50">
		<Breadcrumbs />
		
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900">System Configuration</h1>
				<p class="text-gray-600 mt-2">Configure system settings, security, and notifications.</p>
			</div>
			
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<!-- Main Configuration -->
				<div class="lg:col-span-2 space-y-6">
					<!-- System Settings -->
					<div class="bg-white shadow rounded-lg">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<Globe class="w-5 h-5 text-blue-500 mr-3" />
								<h2 class="text-lg font-medium text-gray-900">System Settings</h2>
							</div>
						</div>
						<div class="px-6 py-4 space-y-4">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label for="site-name" class="block text-sm font-medium text-gray-700">Site Name</label>
									<input 
										id="site-name"
										bind:value={systemSettings.siteName}
										type="text" 
										class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
									/>
								</div>
								<div>
									<label for="site-description" class="block text-sm font-medium text-gray-700">Site Description</label>
									<input 
										id="site-description"
										bind:value={systemSettings.siteDescription}
										type="text" 
										class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
									/>
								</div>
								<div>
									<label for="timezone" class="block text-sm font-medium text-gray-700">Timezone</label>
									<select 
										id="timezone"
										bind:value={systemSettings.timezone}
										class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									>
										<option value="UTC">UTC</option>
										<option value="EST">Eastern Time</option>
										<option value="PST">Pacific Time</option>
										<option value="GMT">GMT</option>
									</select>
								</div>
								<div>
									<label for="language" class="block text-sm font-medium text-gray-700">Language</label>
									<select 
										id="language"
										bind:value={systemSettings.language}
										class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									>
										<option value="en">English</option>
										<option value="es">Spanish</option>
										<option value="fr">French</option>
									</select>
								</div>
							</div>
							<div class="flex items-center">
								<input 
									id="maintenance-mode"
									bind:checked={systemSettings.maintenanceMode}
									type="checkbox" 
									class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
								/>
								<label for="maintenance-mode" class="ml-2 block text-sm text-gray-900">
									Enable Maintenance Mode
								</label>
							</div>
						</div>
					</div>
					
					<!-- Security Settings -->
					<div class="bg-white shadow rounded-lg">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<Shield class="w-5 h-5 text-green-500 mr-3" />
								<h2 class="text-lg font-medium text-gray-900">Security Settings</h2>
							</div>
						</div>
						<div class="px-6 py-4 space-y-4">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label for="session-timeout" class="block text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
									<input 
										id="session-timeout"
										bind:value={securitySettings.sessionTimeout}
										type="number" 
										class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
									/>
								</div>
								<div>
									<label for="max-login-attempts" class="block text-sm font-medium text-gray-700">Max Login Attempts</label>
									<input 
										id="max-login-attempts"
										bind:value={securitySettings.maxLoginAttempts}
										type="number" 
										class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
									/>
								</div>
								<div>
									<label for="password-min-length" class="block text-sm font-medium text-gray-700">Password Min Length</label>
									<input 
										id="password-min-length"
										bind:value={securitySettings.passwordMinLength}
										type="number" 
										class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
									/>
								</div>
							</div>
							<div class="flex items-center">
								<input 
									id="require-mfa"
									bind:checked={securitySettings.requireMFA}
									type="checkbox" 
									class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
								/>
								<label for="require-mfa" class="ml-2 block text-sm text-gray-900">
									Require Multi-Factor Authentication
								</label>
							</div>
						</div>
					</div>
					
					<!-- Notification Settings -->
					<div class="bg-white shadow rounded-lg">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<Bell class="w-5 h-5 text-purple-500 mr-3" />
								<h2 class="text-lg font-medium text-gray-900">Notification Settings</h2>
							</div>
						</div>
						<div class="px-6 py-4 space-y-4">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="flex items-center">
									<input 
										id="email-notifications"
										bind:checked={notificationSettings.emailNotifications}
										type="checkbox" 
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
									/>
									<label for="email-notifications" class="ml-2 block text-sm text-gray-900">
										Email Notifications
									</label>
								</div>
								<div class="flex items-center">
									<input 
										id="sms-notifications"
										bind:checked={notificationSettings.smsNotifications}
										type="checkbox" 
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
									/>
									<label for="sms-notifications" class="ml-2 block text-sm text-gray-900">
										SMS Notifications
									</label>
								</div>
								<div class="flex items-center">
									<input 
										id="push-notifications"
										bind:checked={notificationSettings.pushNotifications}
										type="checkbox" 
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
									/>
									<label for="push-notifications" class="ml-2 block text-sm text-gray-900">
										Push Notifications
									</label>
								</div>
								<div class="flex items-center">
									<input 
										id="admin-alerts"
										bind:checked={notificationSettings.adminAlerts}
										type="checkbox" 
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
									/>
									<label for="admin-alerts" class="ml-2 block text-sm text-gray-900">
										Admin Alerts
									</label>
								</div>
							</div>
						</div>
					</div>
					
					<!-- Database Settings -->
					<div class="bg-white shadow rounded-lg">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center">
								<Database class="w-5 h-5 text-orange-500 mr-3" />
								<h2 class="text-lg font-medium text-gray-900">Database Settings</h2>
							</div>
						</div>
						<div class="px-6 py-4 space-y-4">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label for="backup-frequency" class="block text-sm font-medium text-gray-700">Backup Frequency</label>
									<select 
										id="backup-frequency"
										bind:value={databaseSettings.backupFrequency}
										class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
									>
										<option value="daily">Daily</option>
										<option value="weekly">Weekly</option>
										<option value="monthly">Monthly</option>
									</select>
								</div>
								<div>
									<label for="retention-days" class="block text-sm font-medium text-gray-700">Retention (days)</label>
									<input 
										id="retention-days"
										bind:value={databaseSettings.retentionDays}
										type="number" 
										class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
									/>
								</div>
							</div>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="flex items-center">
									<input 
										id="compression"
										bind:checked={databaseSettings.compression}
										type="checkbox" 
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
									/>
									<label for="compression" class="ml-2 block text-sm text-gray-900">
										Enable Compression
									</label>
								</div>
								<div class="flex items-center">
									<input 
										id="encryption"
										bind:checked={databaseSettings.encryption}
										type="checkbox" 
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
									/>
									<label for="encryption" class="ml-2 block text-sm text-gray-900">
										Enable Encryption
									</label>
								</div>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Sidebar -->
				<div class="space-y-6">
					<!-- Actions -->
					<div class="bg-white shadow rounded-lg p-6">
						<h3 class="text-lg font-medium text-gray-900 mb-4">Actions</h3>
						<div class="space-y-3">
							<button
								onclick={saveSettings}
								class="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
							>
								<Save class="w-4 h-4 mr-2" />
								Save Changes
							</button>
							<button
								onclick={resetSettings}
								class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium bg-white hover:bg-gray-50 transition-colors duration-200"
							>
								<RotateCcw class="w-4 h-4 mr-2" />
								Reset to Defaults
							</button>
						</div>
					</div>
					
					<!-- Quick Info -->
					<div class="bg-white shadow rounded-lg p-6">
						<h3 class="text-lg font-medium text-gray-900 mb-4">Configuration Info</h3>
						<div class="space-y-3 text-sm text-gray-600">
							<p>Last saved: 2 hours ago</p>
							<p>Last backup: 1 day ago</p>
							<p>Config version: 2.1.0</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Save Modal -->
	{#if showSaveModal}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
				<div class="mt-3 text-center">
					<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
						<Save class="h-6 w-6 text-green-600" />
					</div>
					<h3 class="text-lg font-medium text-gray-900 mt-4">Settings Saved</h3>
					<p class="text-sm text-gray-500 mt-2">Your configuration changes have been saved successfully.</p>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Reset Modal -->
	{#if showResetModal}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
				<div class="mt-3 text-center">
					<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
						<RotateCcw class="h-6 w-6 text-blue-600" />
					</div>
					<h3 class="text-lg font-medium text-gray-900 mt-4">Settings Reset</h3>
					<p class="text-sm text-gray-500 mt-2">All settings have been reset to their default values.</p>
				</div>
			</div>
		</div>
	{/if}
</RoleGuard>
