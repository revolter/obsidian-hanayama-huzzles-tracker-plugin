import dedent from 'dedent';
import escapeStringRegExp from 'escape-string-regexp';
import { Editor, MarkdownView, Plugin } from 'obsidian';

export default class HanayamaHuzzlesTrackerPlugin extends Plugin {
	private static #startMarker: string = '<!-- Hanayama Huzzles start -->';
	private static #endMarker: string = '<!-- Hanayama Huzzles end -->';

	async onload() {
		this.addCommand({
			id: 'update-list',
			name: 'Update list',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const content: string = editor.getValue();
				const newContent: string = this.#updatedListInContent(content);

				editor.setValue(newContent);
			}
		});
	}

	onunload() {}

	private #updatedListInContent(content: string): string {
		const escapedStartMarker: string = escapeStringRegExp(HanayamaHuzzlesTrackerPlugin.#startMarker);
		const escapedEndMarker: string = escapeStringRegExp(HanayamaHuzzlesTrackerPlugin.#endMarker);

		const regex: RegExp = new RegExp(`${escapedStartMarker}(?<list>.*?)${escapedEndMarker}`, 's');
		const match: [string] = content.match(regex);

		if (match != null && match.groups != null && match.groups.list != null) {
			const list: string = match.groups.list;
			const updatedList: string = this.#updatedList(list);
			const updatedContent: string = content.replace(regex, `${HanayamaHuzzlesTrackerPlugin.#startMarker}${updatedList}${HanayamaHuzzlesTrackerPlugin.#endMarker}`);

			return updatedContent;
		} else {
			const list: string = 'updated list';
			const updatedList: string = this.#updatedList(list);

			return dedent
				`${content}

				${HanayamaHuzzlesTrackerPlugin.#startMarker}

				${updatedList}

				${HanayamaHuzzlesTrackerPlugin.#endMarker}`;
		}
	}

	private #updatedList(list: string): string {
		return list.toUpperCase();
	}
}
