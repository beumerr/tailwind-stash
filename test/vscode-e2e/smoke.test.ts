/**
 * Smoke tests that run inside a real VS Code instance.
 * These verify the extension activates, registers commands, and basic
 * operations work against the actual VS Code API (not mocks).
 */
import * as assert from "node:assert"
import * as vscode from "vscode"

/** Wrap Thenable to Promise for assert.doesNotReject */
function asPromise<T>(thenable: Thenable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    thenable.then(resolve, reject)
  })
}

describe("Extension Smoke Tests", () => {
  before(async () => {
    // Wait for the extension to activate
    const ext = vscode.extensions.getExtension("beumerr.tailwind-stash")
    if (ext && !ext.isActive) {
      await ext.activate()
    }
  })

  it("extension is present", () => {
    const ext = vscode.extensions.getExtension("beumerr.tailwind-stash")
    assert.ok(ext, "Extension should be installed")
  })

  it("extension activates successfully", async () => {
    const ext = vscode.extensions.getExtension("beumerr.tailwind-stash")
    assert.ok(ext, "Extension should be installed")
    assert.strictEqual(ext.isActive, true, "Extension should be active")
  })

  it("all commands are registered", async () => {
    const allCommands = await asPromise(vscode.commands.getCommands(true))
    const expectedCommands = [
      "tailwindStash.collapseAll",
      "tailwindStash.expandAll",
      "tailwindStash.expandPlaceholder",
      "tailwindStash.toggleCollapse",
      "tailwindStash.showCssPreview",
      "tailwindStash.hideCssPreview",
      "tailwindStash.toggleCssPreview",
    ]

    for (const cmd of expectedCommands) {
      assert.ok(allCommands.includes(cmd), `Command "${cmd}" should be registered`)
    }
  })

  it("toggleCollapse command executes without error", async () => {
    await assert.doesNotReject(
      asPromise(vscode.commands.executeCommand("tailwindStash.toggleCollapse")),
    )
  })

  it("showCssPreview opens a webview panel", async () => {
    await asPromise(vscode.commands.executeCommand("tailwindStash.showCssPreview"))

    // Give the panel a moment to open
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Verify a panel was created by checking if hideCssPreview doesn't throw
    await assert.doesNotReject(
      asPromise(vscode.commands.executeCommand("tailwindStash.hideCssPreview")),
    )
  })

  it("toggleCssPreview creates and destroys the panel", async () => {
    // Open
    await asPromise(vscode.commands.executeCommand("tailwindStash.toggleCssPreview"))
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Close
    await assert.doesNotReject(
      asPromise(vscode.commands.executeCommand("tailwindStash.toggleCssPreview")),
    )
  })

  it("collapseAll and expandAll execute without error", async () => {
    await assert.doesNotReject(
      asPromise(vscode.commands.executeCommand("tailwindStash.collapseAll")),
    )
    await assert.doesNotReject(asPromise(vscode.commands.executeCommand("tailwindStash.expandAll")))
  })

  it("extension contributes expected configuration", () => {
    const config = vscode.workspace.getConfiguration("tailwindStash")

    // Verify key settings exist with defaults
    assert.strictEqual(config.get("foldByDefault"), true)
    assert.strictEqual(config.get("placeholderStyle"), "count")
    assert.strictEqual(config.get("minClassCount"), 4)
    assert.strictEqual(config.get("scrollEditorOnPanelSelect"), true)
    assert.strictEqual(config.get("scrollPanelOnEditorSelect"), true)
    assert.deepStrictEqual(config.get("placeholders"), {})
    assert.strictEqual(config.get("placeholderFormat"), "{keys} +{rest}")
  })
})
