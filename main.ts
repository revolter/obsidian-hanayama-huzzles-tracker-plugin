import dedent from 'dedent';
import escapeStringRegExp from 'escape-string-regexp';
import remarkGFM from 'remark-gfm';
import { Editor, MarkdownView, Plugin } from 'obsidian';
import { remark } from 'remark';

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

			return content.replace(
				regex,
				dedent
					`${HanayamaHuzzlesTrackerPlugin.#startMarker}

					${updatedMarkdownList}

					${HanayamaHuzzlesTrackerPlugin.#endMarker}`
			);
		} else {
			const markdownList: string = dedent
				`First | Second
				--- | ---
				A | x`;
			const updatedMarkdownList: string = this.#updatedMarkdownList(markdownList);

			return dedent
				`${content}

				${HanayamaHuzzlesTrackerPlugin.#startMarker}

				${updatedMarkdownList}

				${HanayamaHuzzlesTrackerPlugin.#endMarker}`;
		}
	}

	private #updatedMarkdownList(markdownList: string): string {
		const list: [[string]] = this.#markdownTableToArrayOfArrays(markdownList);

		list[1][1] = list[1][1].toUpperCase();

		return this.#arrayOfArraysToMarkdownTableString(list);
	}

	private #arrayOfArraysToMarkdownTableString(arrayOfArrays: [[string]]): string {
		const table = {
			type: 'table',
			children: arrayOfArrays.map(
				row => ({
					type: 'tableRow',
					children: row.map(
						cell => ({
							type: 'tableCell',
							children: [{
								type: 'text',
								value: cell.toString()
							}]
						})
					)
				})
			)
		};

		return remark()
			.use(remarkGFM)
			.stringify(table)
			.replace(/\n$/, '');
	}

	private #markdownTableToArrayOfArrays(markdownTableString: string): [[string]] {
		const ast = remark()
			.use(remarkGFM)
			.parse(markdownTableString);
		const table = ast.children.find(node => node.type === 'table');

		return table.children.map(
			row => row.children.map(
				cell => cell.children[0].value
			)
		);
	}
}
