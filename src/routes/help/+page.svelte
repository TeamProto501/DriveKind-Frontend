<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { BookOpen, MessageCircle } from '@lucide/svelte';
</script>

<RoleGuard requiredRoles={['Admin', 'Dispatcher', 'Driver', 'Volunteer']}>
	<div class="min-h-screen bg-gray-50">
		<Breadcrumbs />

		<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900">Help & Support</h1>
				<p class="text-gray-600 mt-2">
					Get help with using DriveKind and find answers to common questions.
				</p>
			</div>

			<!-- TOP CARDS -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Documentation -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div class="text-center">
						<BookOpen class="w-12 h-12 text-blue-600 mx-auto mb-4" />
						<h3 class="text-lg font-medium text-gray-900 mb-2">Documentation</h3>
						<p class="text-gray-500 mb-4">
							Comprehensive guides and tutorials for all features.
						</p>
						<button
							class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
						>
							View Docs
						</button>
					</div>
				</div>

				<!-- Contact Support -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div class="text-center">
						<MessageCircle class="w-12 h-12 text-green-600 mx-auto mb-4" />
						<h3 class="text-lg font-medium text-gray-900 mb-2">Contact Support</h3>
						<p class="text-gray-500 mb-2">
							If you need assistance, please contact your organization's administrator.
						</p>
					</div>
				</div>
			</div>

			<!-- VIDEO TUTORIAL -->
			<div class="mt-8">
				<h2 class="text-lg font-medium text-gray-900 mb-3">DriveKind Demo Video</h2>
				<div
					class="relative w-full overflow-hidden rounded-lg shadow-sm bg-black"
					style="padding-top: 56.25%;"
				>
					<iframe
						src="https://www.youtube.com/embed/TdHcbWcQ73o"
						title="DriveKind Demo Video"
						class="absolute inset-0 w-full h-full"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowfullscreen
					></iframe>
				</div>
			</div>

			<!-- FAQ SECTION -->
			<div class="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-lg font-medium text-gray-900">Frequently Asked Questions</h2>
				</div>

				<div class="p-6 space-y-6">
					<!-- 1. Create Ride Request -->
					<div class="border-b border-gray-200 pb-4">
						<h3 class="text-base font-semibold text-gray-900 mb-1">
							How do I create a ride request? (Dispatcher)
						</h3>
						<p class="text-gray-600">
							Go to the Dispatcher tab, open Ride Management, and click
							<strong>Create New Ride Request</strong>. There you will see a form to fill out the
							necessary information regarding the ride request.
						</p>
					</div>

					<!-- 2. Assign a Driver -->
					<div class="border-b border-gray-200 pb-4">
						<h3 class="text-base font-semibold text-gray-900 mb-1">
							How do I assign a driver to a ride? (Dispatcher)
						</h3>
						<p class="text-gray-600">
							Under Ride Management, select <strong>Send Request</strong> to view available drivers
							and notify any number of them. Drivers may Accept or Cancel the request.
							Alternatively, select <strong>Auto Assign</strong> to automatically assign a driver.
						</p>
					</div>

					<!-- 3. Database Reports -->
					<div class="border-b border-gray-200 pb-4">
						<h3 class="text-base font-semibold text-gray-900 mb-1">
							How do I generate database reports? (Admin)
						</h3>
						<p class="text-gray-600">
							Go to the Admin tab, open <strong>Database</strong>, and select your desired table.
							You can add filters and export results to CSV. You may also visit the
							<strong>Reports</strong> page to generate specialized reports.
						</p>
					</div>

					<!-- 4. Make a Call Entry -->
					<div class="border-b border-gray-200 pb-4">
						<h3 class="text-base font-semibold text-gray-900 mb-1">
							How do I make a call entry? (Admin)
						</h3>
						<p class="text-gray-600">
							Navigate to the Admin tab, open <strong>Audit &amp; Calls</strong>, go to
							<strong>Calls Log</strong>, and click <strong>Add Call</strong>.
						</p>
					</div>

					<!-- 5. Log Unavailability -->
					<div>
						<h3 class="text-base font-semibold text-gray-900 mb-1">
							How do I log my unavailability? (Driver)
						</h3>
						<p class="text-gray-600">
							Open the Driver tab, go to <strong>Unavailability</strong>, and enter your
							unavailable times as:
						</p>
						<ul class="list-disc pl-6 text-gray-600 mt-1">
							<li>One-time</li>
							<li>Date range</li>
							<li>Weekly occurrences</li>
						</ul>
					</div>

					<!-- Contact footer -->
					<div class="pt-4 border-t border-gray-200">
						<p class="text-gray-600 text-sm">
							Contact your administrator for any additional questions.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</RoleGuard>