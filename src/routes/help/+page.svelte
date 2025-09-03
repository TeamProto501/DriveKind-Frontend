<script lang="ts">
	import RoleGuard from '$lib/components/RoleGuard.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { HelpCircle, BookOpen, MessageCircle, Phone, Mail, FileText } from '@lucide/svelte';
</script>

<RoleGuard requiredRoles={['Admin', 'Dispatcher', 'Driver', 'Volunteer']}>
	<div class="min-h-screen bg-gray-50">
		<Breadcrumbs />
		
		<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900">Help & Support</h1>
				<p class="text-gray-600 mt-2">Get help with using DriveKind and find answers to common questions.</p>
			</div>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div class="text-center">
						<BookOpen class="w-12 h-12 text-blue-600 mx-auto mb-4" />
						<h3 class="text-lg font-medium text-gray-900 mb-2">Documentation</h3>
						<p class="text-gray-500 mb-4">Comprehensive guides and tutorials for all features.</p>
						<button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
							View Docs
						</button>
					</div>
				</div>
				
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div class="text-center">
						<MessageCircle class="w-12 h-12 text-green-600 mx-auto mb-4" />
						<h3 class="text-lg font-medium text-gray-900 mb-2">Contact Support</h3>
						<p class="text-gray-500 mb-4">Get in touch with our support team for assistance.</p>
						<button class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200">
							Contact Us
						</button>
					</div>
				</div>
			</div>
			
			<div class="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-lg font-medium text-gray-900">Frequently Asked Questions</h2>
				</div>
				
				<div class="p-6">
					<div class="text-center py-12">
						<HelpCircle class="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<h3 class="text-lg font-medium text-gray-900 mb-2">Help Content Coming Soon</h3>
						<p class="text-gray-500">This section will contain FAQs, troubleshooting guides, and video tutorials.</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</RoleGuard>
