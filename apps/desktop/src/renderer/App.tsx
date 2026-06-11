import { WritingEditor } from '@writer/editor'
import { WritingShellPreview } from '@writer/ui'

export function App() {
  return (
    <WritingShellPreview>
      <WritingEditor />
    </WritingShellPreview>
  )
}
