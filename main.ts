import dedent from 'dedent';
import escapeStringRegExp from 'escape-string-regexp';
import remarkGFM from 'remark-gfm';
import { Editor, MarkdownView, Plugin } from 'obsidian';
import { remark } from 'remark';

export default class HanayamaHuzzlesTrackerPlugin extends Plugin {
	static #startMarker: string = '<!-- Hanayama Huzzles start -->';
	static #endMarker: string = '<!-- Hanayama Huzzles end -->';

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

	#updatedListInContent(content: string): string {
		const escapedStartMarker: string = escapeStringRegExp(HanayamaHuzzlesTrackerPlugin.#startMarker);
		const escapedEndMarker: string = escapeStringRegExp(HanayamaHuzzlesTrackerPlugin.#endMarker);

		const regex: RegExp = new RegExp(`${escapedStartMarker}(?<markdownList>.*?)${escapedEndMarker}`, 's');
		const match: [string] = content.match(regex);

		if (match != null && match.groups != null && match.groups.markdownList != null) {
			const markdownList: string = match.groups.markdownList;
			const list: [[string]] = this.#markdownTableToArrayOfArrays(markdownList);
			const updatedMarkdownList: string = this.#updatedMarkdownList(list);

			return content.replace(regex, updatedMarkdownList);
		} else {
			const updatedMarkdownList: string = this.#updatedMarkdownList([]);

			return dedent
				`${content}

				${updatedMarkdownList}`;
		}
	}

	#updatedMarkdownList(list: [[string]]): string {
		if (list.length > 0) {
			list[1][1] = list[1][1].toUpperCase();
		}

		const updatedList: string = this.#arrayOfArraysToMarkdownTableString(list);

		return dedent
			`${HanayamaHuzzlesTrackerPlugin.#startMarker}

			${updatedList}

			${HanayamaHuzzlesTrackerPlugin.#endMarker}`;
	}

	#arrayOfArraysToMarkdownTableString(arrayOfArrays: [[string]]): string {
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

	#markdownTableToArrayOfArrays(markdownTableString: string): [[string]] {
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
