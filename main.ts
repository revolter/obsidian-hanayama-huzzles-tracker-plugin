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

		const regex: RegExp = new RegExp(`${escapedStartMarker}(?<markdownList>.*?)${escapedEndMarker}`, 's');
		const match: [string] = content.match(regex);

		if (match != null && match.groups != null && match.groups.markdownList != null) {
			const markdownList: string = match.groups.markdownList;
			const updatedMarkdownList: string = this.#updatedMarkdownList(markdownList);
			const updatedContent: string = content.replace(regex, `${HanayamaHuzzlesTrackerPlugin.#startMarker}${updatedMarkdownList}${HanayamaHuzzlesTrackerPlugin.#endMarker}`);

			return updatedContent;
		} else {
			const markdownList: string = 'updated list';
			const updatedMarkdownList: string = this.#updatedMarkdownList(markdownList);

			return dedent
				`${content}

				${HanayamaHuzzlesTrackerPlugin.#startMarker}

				${updatedMarkdownList}

				${HanayamaHuzzlesTrackerPlugin.#endMarker}`;
		}
	}

	private #updatedMarkdownList(markdownList: string): string {
		return markdownList.toUpperCase();
	}
}
