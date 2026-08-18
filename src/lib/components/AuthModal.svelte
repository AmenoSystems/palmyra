<script lang="ts">
  type Props = {
    open?: boolean;
    onClose?: () => void;
  };
  
  let { open = false, onClose = () => {} }: Props = $props();
</script>
{#if open}
  <!-- Modal backdrop (click to close) -->
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity"
    on:click={onClose}
    on:keydown={(e) => e.key === 'Escape' && onClose()}
  >
    <!-- Modal content (stop propagation so clicking inside doesn't close) -->
    <div 
      class="relative bg-white dark:bg-stone-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 sm:p-8"
      on:click|stopPropagation
    >
      <!-- Close button -->
      <button 
        class="absolute top-3 right-3 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
        on:click={onClose}
        aria-label="Close modal"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Modal title -->
      <h2 class="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-4">Welcome Back</h2>
      
      <!-- Placeholder form (replace with your auth logic) -->
      <form class="space-y-4" on:submit|preventDefault={() => alert('Login logic here')}>
        <div>
          <label for="email" class="block text-sm font-medium text-stone-700 dark:text-stone-300">Email</label>
          <input 
            type="email" 
            id="email" 
            class="mt-1 block w-full rounded-md border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-stone-700 dark:text-stone-300">Password</label>
          <input 
            type="password" 
            id="password" 
            class="mt-1 block w-full rounded-md border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="••••••••"
          />
        </div>
        <button 
          type="submit" 
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-stone-800"
        >
          Sign In
        </button>
      </form>
      
      <p class="mt-4 text-sm text-center text-stone-600 dark:text-stone-400">
        Don't have an account? <a href="#" class="text-indigo-600 hover:underline dark:text-indigo-400">Sign up</a>
      </p>
    </div>
  </div>
{/if}