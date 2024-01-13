import { Editor, MarkdownView, Plugin } from 'obsidian';

export default class HanayamaHuzzlesTrackerPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: 'update-list',
			name: 'Update list',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection('Update list');
			}
		});
	}

	onunload() {}
}
