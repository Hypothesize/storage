import * as Http from "./web"
import { String__ } from "./stdlib"
import * as shortid from "shortid"
import { generate as generateRepoGroup } from "./repository"
import { EntityParents } from "./constants"

type DTOsMap = Hypothesize.Entities.Map
type Obj<TValue = any, TKey extends string = string> = { [key in TKey]: TValue }

export class Repository extends generateRepoGroup(class {
	readonly _baseUrl: string
	constructor(args: { baseUrl: string }) {
		this._baseUrl = args.baseUrl
		console.log(`API repository base url: ${this._baseUrl}`)
	}
	async findAsync<E extends keyof DTOsMap>(args: { entity: E, id: string }): Promise<DTOsMap[E]["fromStorage"]> {
		const entityPluralName = new String__(args.entity).plural()
		return Http
			.getAsync({ uri: `${this._baseUrl}/${entityPluralName}/${args.id}/` })
			.then(res => {
				Http.checkStatusCode(res, `Error finding ${args.entity} with id ${args.id} data`)
				return JSON.parse(res.body) as DTOsMap[E]["fromStorage"]
			})
	}
	async getAsync<E extends keyof DTOsMap>(args: { entity: E, parentId?: string, filters?: Hypothesize.Data.FilterGroup<DTOsMap[E]["fromStorage"]> }): Promise<DTOsMap[E]["fromStorage"][]> {
		console.log(`API repository getAsync(entity=${args.entity}, parent id=${JSON.stringify(args.parentId)}, filters=${JSON.stringify(args.filters)})`)

		const parentEntity = EntityParents["user"]
		const pluralParent = parentEntity !== "" ? new String__(parentEntity).plural() : ""
		const effectiveParentId = parentEntity !== "" ? args.parentId : ""
		const pluralEntity = new String__(args.entity).plural()

		const request: Http.GetRequest = {
			uri: [this._baseUrl, pluralParent, effectiveParentId, pluralEntity].filter(x => x !== "").join("/"),
			query: args.filters ? { filter: JSON.stringify(args.filters) } : undefined
		}
		console.log(`API repository getAsync(); request: ${JSON.stringify(request)}`)

		return Http.getAsync(request).then((res: any) => {
			Http.checkStatusCode(res, `Error retrieving data`)
			return JSON.parse(res.body) as DTOsMap[E]["fromStorage"][]
		})
	}
	async saveAsync<E extends keyof DTOsMap>(args: { entity: E, obj: DTOsMap[E]["toStorage"], mode: "insert" | "update" }): Promise<DTOsMap[E]["fromStorage"]> {
		const entityPluralName = new String__(args.entity).plural()

		if (args.mode === "insert") {
			return Http
				.postAsync({
					uri: `${this._baseUrl}/api/${entityPluralName}/`,
					data: { type: "json", body: args.obj as Obj }
				}).then(res => {
					Http.checkStatusCode(res, `Error inserting ${entityPluralName} data`)
					return JSON.parse(res.body) as DTOsMap[E]["fromStorage"]
				})
		}
		else {
			return Http
				.putAsync({
					uri: `${this._baseUrl}/api/${entityPluralName}/`,
					data: { type: "json", body: args.obj as Obj }
				}).then(res => {
					Http.checkStatusCode(res, `Error updating ${entityPluralName} data`)
					return JSON.parse(res.body) as DTOsMap[E]["fromStorage"]
				})
		}
	}
	async deleteAsync<E extends keyof DTOsMap>(args: { entity: E, id: any }): Promise<void> {
		const entityPluralName = new String__(args.entity).plural()
		const res = await Http.deleteAsync({ uri: `${this._baseUrl}/${entityPluralName}/${args.id}` })
		Http.checkStatusCode(res, `Error deleting ${entityPluralName} data`)
	}

	protected getPresignedS3UrlAsync(key?: string) {
		return Http.getAsync({
			uri: `${this._baseUrl}/presigned_s3_url`,
			query: key ? { key } : undefined
		}).then(res => res.body)
	}

	extensions = {
		/** Store raw data in S3 and returns a promise of the URL of the stored object
		* @param data Data to be stored
		* @param key Key used to identify the stored data
		* @param string The URL where the data will be available, for instance the CloudFront base URL
		*/
		storeRawAsync: async (data: ArrayBuffer | Obj, key?: string, prefix?: string): Promise<string> => {
			const _key = key ?? shortid.generate()
			try {
				await Http.putAsync({
					uri: await this.getPresignedS3UrlAsync(_key),
					data: {
						type: "text",
						body: data instanceof ArrayBuffer
							? arrayBufferToBase64(data)
							: JSON.stringify(data)
					}
				})
			}
			catch (err) {
				throw new Error(`Error uploading data: ${err}`)
			}

			return `${prefix}/${_key}`
		},

		/** Retrieve raw data from S3 (via cloudfront)
		 * @param url S3 (Cloudfront) URL of the data to retreive
		 */
		getRawAsync: async (url: string): Promise<any> => {
			try {
				const resultMsg = await Http.getAsync({ uri: url })
				return JSON.parse(resultMsg.body)
			}
			catch (err) {
				throw new Error(`Error getting or parsing raw data at URL "${url}`)
			}
		}
	}
}) {

}

function arrayBufferToBase64(buffer: ArrayBuffer) {
	var binary = '';
	var bytes = new Uint8Array(buffer);
	var len = bytes.byteLength;
	for (var i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return window.btoa(binary);
}