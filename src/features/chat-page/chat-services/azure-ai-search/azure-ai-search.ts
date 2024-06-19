"use server";
import "server-only";

import { userHashedId } from "@/features/auth-page/helpers";
import { ServerActionResponse } from "@/features/common/server-action-response";
import {
  AzureAISearchIndexClientInstance,
  AzureAISearchInstance,
} from "@/features/common/services/ai-search";
import { uniqueId } from "@/features/common/util";
import {
  AzureKeyCredential,
  SearchClient,
  SearchIndex,
} from "@azure/search-documents";

export interface SharePointDocumentIndex {
  id: string;
  metadata_spo_item_name: string;
  metadata_spo_item_path: string;
  metadata_spo_item_content_type: string;
  metadata_spo_item_last_modified: string;
  metadata_spo_item_size: number;
  content: string;
}

export type DocumentSearchResponse = {
  score: number;
  document: SharePointDocumentIndex;
};

export const SimpleSearch = async (
  searchText?: string,
  filter?: string
): Promise<ServerActionResponse<Array<DocumentSearchResponse>>> => {
  try {
    const instance = AzureAISearchInstance<SharePointDocumentIndex>();
    const searchResults = await instance.search(searchText, { filter: filter });

    const results: Array<DocumentSearchResponse> = [];
    for await (const result of searchResults.results) {
      results.push({
        score: result.score,
        document: result.document,
      });
    }

    return {
      status: "OK",
      response: results,
    };
  } catch (e) {
    return {
      status: "ERROR",
      errors: [
        {
          message: `${e}`,
        },
      ],
    };
  }
};

export const IndexDocuments = async (
  fileName: string,
  docs: string[]
): Promise<Array<ServerActionResponse<boolean>>> => {
  try {
    const documentsToIndex: SharePointDocumentIndex[] = [];

    for (const doc of docs) {
      const docToAdd: SharePointDocumentIndex = {
        id: uniqueId(),
        metadata_spo_item_name: fileName,
        metadata_spo_item_path: `/path/to/${fileName}`, // 假设这将是你的路径
        metadata_spo_item_content_type: "text/plain", // 根据你的文件类型调整
        metadata_spo_item_last_modified: new Date().toISOString(), // 或者其他适当的日期
        metadata_spo_item_size: Buffer.byteLength(doc, "utf-8"),
        content: doc,
      };

      documentsToIndex.push(docToAdd);
    }

    const instance = AzureAISearchInstance();
    const uploadResponse = await instance.uploadDocuments(documentsToIndex);

    const response: Array<ServerActionResponse<boolean>> = [];
    uploadResponse.results.forEach((r) => {
      if (r.succeeded) {
        response.push({
          status: "OK",
          response: r.succeeded,
        });
      } else {
        response.push({
          status: "ERROR",
          errors: [
            {
              message: `${r.errorMessage}`,
            },
          ],
        });
      }
    });

    return response;
  } catch (e) {
    return [
      {
        status: "ERROR",
        errors: [
          {
            message: `${e}`,
          },
        ],
      },
    ];
  }
};

export const DeleteDocuments = async (
  chatThreadId: string
): Promise<Array<ServerActionResponse<boolean>>> => {
  try {
    // find all documents for chat thread
    const documentsInChatResponse = await SimpleSearch(
      undefined,
      `metadata_spo_item_name eq '${chatThreadId}'`
    );

    if (documentsInChatResponse.status === "OK") {
      const instance = AzureAISearchInstance();
      const deletedResponse = await instance.deleteDocuments(
        documentsInChatResponse.response.map((r) => r.document)
      );
      const response: Array<ServerActionResponse<boolean>> = [];
      deletedResponse.results.forEach((r) => {
        if (r.succeeded) {
          response.push({
            status: "OK",
            response: r.succeeded,
          });
        } else {
          response.push({
            status: "ERROR",
            errors: [
              {
                message: `${r.errorMessage}`,
              },
            ],
          });
        }
      });

      return response;
    }

    return [documentsInChatResponse];
  } catch (e) {
    return [
      {
        status: "ERROR",
        errors: [
          {
            message: `${e}`,
          },
        ],
      },
    ];
  }
};

export const EnsureIndexIsCreated = async (): Promise<
  ServerActionResponse<SearchIndex>
> => {
  try {
    const client = AzureAISearchIndexClientInstance();
    const result = await client.getIndex(process.env.AZURE_SEARCH_INDEX_NAME);
    return {
      status: "OK",
      response: result,
  return {
      status: "OK",
      response: result,
    };
  } catch (e) {
    return await CreateSearchIndex();
  }
};

const CreateSearchIndex = async (): Promise<
  ServerActionResponse<SearchIndex>
> => {
  try {
    const client = AzureAISearchIndexClientInstance();
    const result = await client.createIndex({
      name: process.env.AZURE_SEARCH_INDEX_NAME,
      fields: [
        {
          name: "id",
          type: "Edm.String",
          key: true,
          searchable: false,
        },
        {
          name: "metadata_spo_item_name",
          type: "Edm.String",
          searchable: true,
          filterable: false,
          sortable: false,
          facetable: false,
        },
        {
          name: "metadata_spo_item_path",
          type: "Edm.String",
          searchable: false,
          filterable: false,
          sortable: false,
          facetable: false,
        },
        {
          name: "metadata_spo_item_content_type",
          type: "Edm.String",
          searchable: false,
          filterable: true,
          sortable: false,
          facetable: true,
        },
        {
          name: "metadata_spo_item_last_modified",
          type: "Edm.DateTimeOffset",
          searchable: false,
          filterable: false,
          sortable: true,
          facetable: false,
        },
        {
          name: "metadata_spo_item_size",
          type: "Edm.Int64",
          searchable: false,
          filterable: false,
          sortable: false,
          facetable: false,
        },
        {
          name: "content",
          type: "Edm.String",
          searchable: true,
          filterable: false,
          sortable: false,
          facetable: false,
        },
      ],
    });

    return {
      status: "OK",
      response: result,
    };
  } catch (e) {
    return {
      status: "ERROR",
      errors: [
        {
          message: `${e}`,
        },
      ],
    };
  }
};    
