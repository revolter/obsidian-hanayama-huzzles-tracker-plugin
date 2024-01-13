import { Editor, MarkdownView, Plugin } from 'obsidian';

export default class HanayamaHuzzlesTrackerPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection('Sample Editor Command');
			}
		});
	}

	onunload() {}
}
