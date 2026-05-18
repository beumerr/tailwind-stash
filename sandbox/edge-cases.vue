<template>
  <!--
    Edge cases for folding / panel behavior.

    Test:
      - Multi-line class strings fold correctly
      - Template literals (`:class`) are handled
      - Rapid edits don't cause panel disconnect
      - Cursor on a folded line expands it immediately
  -->

  <!-- Multi-line class attribute -->
  <div
    class="
      flex flex-col items-center justify-center
      min-h-screen bg-gradient-to-br
      from-blue-50 to-indigo-100
      p-8 gap-6
    "
  >
    <!-- Nested elements with classes -->
    <div class="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
      <div class="p-6 space-y-4 border-b border-gray-100">
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">
          Edge Cases
        </h1>
      </div>

      <!-- Dynamic classes (Vue :class binding) — should NOT fold the binding -->
      <div :class="['flex', 'gap-2', condition ? 'bg-red-500' : 'bg-green-500']">
        Dynamic
      </div>

      <!-- Class with special chars in Tailwind (brackets, slashes) -->
      <div class="w-[calc(100%-2rem)] bg-black/10 text-[14px] leading-[1.6] p-4 rounded">
        Arbitrary values
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const condition = true
</script>
