<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData, form: ActionData } = $props();

	let loading = $state(false);
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
	<div class="max-w-md w-full space-y-8 p-8">
		<div>
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
				Sign in to your account
			</h2>
		</div>
		
		<div class="mt-8 space-y-4">
			<!-- Login Form -->
			<form 
				method="POST" 
				action="?/login"
				use:enhance={({ formElement, formData, action, cancel, submitter }) => {
					loading = true;
					return async ({ result, update }) => {
						loading = false;
						await update();
					};
				}}
				class="space-y-4"
			>
				<div class="space-y-4">
					<div>
						<label for="email" class="sr-only">Email address</label>
						<input
							id="email"
							name="email"
							type="email"
							value={form?.email ?? ''}
							required
							class="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
							placeholder="Email address"
						/>
					</div>
					<div>
						<label for="password" class="sr-only">Password</label>
						<input
							id="password"
							name="password"
							type="password"
							required
							class="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
							placeholder="Password"
						/>
					</div>
				</div>

				{#if form?.error}
					<div class="text-red-600 text-sm text-center">
						{form.error}
					</div>
				{/if}

				{#if form?.message}
					<div class="text-green-600 text-sm text-center">
						{form.message}
					</div>
				{/if}

				<div class="flex space-x-4">
					<button
						type="submit"
						disabled={loading}
						class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
					>
						{loading ? 'Signing In...' : 'Sign In'}
					</button>
				</div>
			</form>

			<!-- Signup Form -->
			<form 
				method="POST" 
				action="?/signup"
				use:enhance={({ formElement, formData, action, cancel, submitter }) => {
					loading = true;
					return async ({ result, update }) => {
						loading = false;
						await update();
					};
				}}
				class="space-y-4"
			>
				<div class="space-y-4">
					<div>
						<input
							name="email"
							type="email"
							value={form?.email ?? ''}
							required
							class="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
							placeholder="Email for signup"
						/>
					</div>
					<div>
						<input
							name="password"
							type="password"
							required
							class="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
							placeholder="Password for signup"
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
				>
					{loading ? 'Signing Up...' : 'Sign Up'}
				</button>
			</form>
		</div>
		
		<div class="text-center">
			<a href="/" class="text-indigo-600 hover:text-indigo-500">
				← Back to home
			</a>
		</div>
	</div>
</div>