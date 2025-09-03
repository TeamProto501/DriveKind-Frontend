<!-- src/lib/components/Breadcrumbs.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { ChevronRight, Home } from '@lucide/svelte';
	
	interface BreadcrumbItem {
		label: string;
		href?: string;
		icon?: any;
	}
	
	// Generate breadcrumbs based on current route
	$: breadcrumbs = generateBreadcrumbs($page.url.pathname);
	
	function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
		const segments = pathname.split('/').filter(Boolean);
		const items: BreadcrumbItem[] = [
			{ label: 'Home', href: '/', icon: Home }
		];
		
		let currentPath = '';
		segments.forEach((segment, index) => {
			currentPath += `/${segment}`;
			
			// Convert segment to readable label
			const label = segment
				.split('-')
				.map(word => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');
			
			// Don't make the last item a link
			const href = index === segments.length - 1 ? undefined : currentPath;
			
			items.push({ label, href });
		});
		
		return items;
	}
</script>

{#if breadcrumbs.length > 1}
	<nav class="bg-gray-50 border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center space-x-2 py-3">
				{#each breadcrumbs as item, index}
					{#if index > 0}
						<ChevronRight class="w-4 h-4 text-gray-400" />
					{/if}
					
					{#if item.href}
						<a
							href={item.href}
							class="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
						>
							{#if item.icon}
								<item.icon class="w-4 h-4" />
							{/if}
							<span>{item.label}</span>
						</a>
					{:else}
						<span class="flex items-center space-x-1 text-sm font-medium text-gray-900">
							{#if item.icon}
								<item.icon class="w-4 h-4" />
							{/if}
							<span>{item.label}</span>
						</span>
					{/if}
				{/each}
			</div>
		</div>
	</nav>
{/if}
