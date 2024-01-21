import dedent from 'dedent';
import escapeStringRegExp from 'escape-string-regexp';
import { Table } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { Editor, MarkdownView, Notice, Plugin, requestUrl } from 'obsidian';
import { remark } from 'remark';
import remarkGFM from 'remark-gfm';
import { Root } from 'remark-gfm/lib';

class HanayamaHuzzle {
	constructor(
		public level: string,
		public index: string,
		public name: string,
		public imageLinks: string[],
		public status: string = ''
	) {}
}

export default class HanayamaHuzzlesTrackerPlugin extends Plugin {
	static #startMarker: string = '<!-- Hanayama Huzzles start -->';
	static #endMarker: string = '<!-- Hanayama Huzzles end -->';
	static #headers: string[] = ['Level', 'Index', 'Name', 'Picture', 'Status'];

	async onload() {
		this.addCommand({
			id: 'update-list',
			name: 'Update list',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const content: string = editor.getValue();

				this.#updatedListInContent(content).then( newContent => {
					editor.setValue(newContent);

					new Notice('List updated!');
				});
			}
		});
	}

	onunload() {}

	async #updatedListInContent(content: string): Promise<string> {
		const escapedStartMarker: string = escapeStringRegExp(HanayamaHuzzlesTrackerPlugin.#startMarker);
		const escapedEndMarker: string = escapeStringRegExp(HanayamaHuzzlesTrackerPlugin.#endMarker);

		const regex: RegExp = new RegExp(`${escapedStartMarker}(?<markdownList>.*?)${escapedEndMarker}`, 's');
		const match: RegExpMatchArray | null = content.match(regex);

		if (match != null && match.groups != null) {
			const markdownList: string = match.groups.markdownList;
			const list: string[][] = this.#markdownTableToArrayOfArrays(markdownList);
			const updatedMarkdownList: string = await this.#updatedMarkdownList(list);

			return content.replace(regex, updatedMarkdownList);
		} else {
			const updatedMarkdownList: string = await this.#updatedMarkdownList([]);

			return dedent
				`${content}

				${updatedMarkdownList}`;
		}
	}

	async #updatedMarkdownList(list: string[][]): Promise<string> {
		const indexedList = list.slice(1).reduce((map, element) => {
			if (element.length >= 5) {
				const name = element[2];
				const status = element[4];

				map[name] = status;
			}

			return map;
		}, {} as {[key: string]: string});

		const huzzles = await this.#scrapeHuzzles();
		huzzles.forEach( huzzle => {
			huzzle.status = indexedList[huzzle.name] || '';
		});

		const updatedList: string = this.#huzzlesToMarkdownTableString(HanayamaHuzzlesTrackerPlugin.#headers, huzzles);

		return dedent
			`${HanayamaHuzzlesTrackerPlugin.#startMarker}

			${updatedList}

			${HanayamaHuzzlesTrackerPlugin.#endMarker}`;
	}

	async #scrapeHuzzles(): Promise<HanayamaHuzzle[]> {
		const response = await requestUrl('https://hanayama-toys.com/product-category/puzzles/huzzle/level-1-fun');

		const container = document.createElement('template');
		container.innerHTML = response.text;

		const content = container.content;
		const products = Array.from(content.querySelectorAll('#main>.products>.product'));
		const metadataRegex: RegExp = new RegExp(/(?<=\w+[ ])(?<level>\d+)-(?<index>\d+)[ ](?<name>.+)/); // https://regex101.com/r/1vGzHd/1

		return products.flatMap(product => {
			const title = product.querySelector('.product-info>.product-title>a')?.textContent || '';
			const titleMatch: RegExpMatchArray | null = title.match(metadataRegex);

			if (titleMatch == null || titleMatch.groups == null) {
				return [];
			}

			const level = titleMatch.groups.level;
			const index = titleMatch.groups.index;
			const name = titleMatch.groups.name;

			const images = product.querySelectorAll('.product-thumb>a>img');
			const imageLinks = Array.from(images, image => (image as HTMLImageElement).src);

			return new HanayamaHuzzle(level, index, name, imageLinks);
		});
	}

	#huzzlesToMarkdownTableString(headers: string[], huzzles: HanayamaHuzzle[]): string {
		const headerRow = {
			type: 'tableRow',
			children: headers.map(header => ({
				type: 'tableCell',
				children: [{
					type: 'text',
					value: header
				}]
			}))
		};
		const huzzleRows = huzzles.map(huzzle => ({
			type: 'tableRow',
			children: [{
				type: 'tableCell',
				children: [{
					type: 'text',
					value: huzzle.level
				}]
			}, {
				type: 'tableCell',
				children: [{
					type: 'text',
					value: huzzle.index
				}]
			}, {
				type: 'tableCell',
				children: [{
					type: 'text',
					value: huzzle.name
				}]
			}, {
				type: 'tableCell',
				children: [{
					type: 'image',
					alt: '|100',
					url: huzzle.imageLinks[0]
				}, {
					type: 'text',
					value: ' '
				}, {
					type: 'image',
					alt: '|100',
					url: huzzle.imageLinks[1]
				}]
			}, {
				type: 'tableCell',
				children: [{
					type: 'text',
					value: huzzle.status
				}]
			}]
		}));
		const tableRows = [
			...[headerRow],
			...huzzleRows
		]
		const table: Table = {
			type: 'table',
			children: tableRows as any // https://stackoverflow.com/a/47219058/865175
		};
		const root: Root = {
			type: 'root',
			children: [table]
		};

		return remark()
			.use(remarkGFM)
			.stringify(root)
			.replace(/\n$/, '');
	}

	#markdownTableToArrayOfArrays(markdownTableString: string): string[][] {
		const ast = remark()
			.use(remarkGFM)
			.parse(markdownTableString);
		const table: Table = ast.children.find(node => node.type === 'table') as Table;

		return table.children.map(row =>
			row.children.map(cell =>
				cell.children.map(child => {
					switch (child.type) {
						case 'image': return `![${child.alt}](${child.url})`
						default: return toString(child)
					}
				}).join('')
			)
		);
	}
}
