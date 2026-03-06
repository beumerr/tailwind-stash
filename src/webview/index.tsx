import { render } from "preact"

import { Panel } from "./views/panel/panel"

const vscodeApi = acquireVsCodeApi()

const views: Record<string, () => preact.JSX.Element> = {
  panel: () => <Panel vscode={vscodeApi} />,
}

function Root() {
  const viewId = document.getElementById("root")?.dataset.view ?? "panel"
  const View = views[viewId] ?? views.panel
  return <View />
}

render(<Root />, document.getElementById("root")!)
