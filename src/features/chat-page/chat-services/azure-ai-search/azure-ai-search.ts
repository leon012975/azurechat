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

export interface AzureSearchDocumentIndex {
  id: string;
  content: string;
  user: string;
  chatThreadId: string;
  metadata_spo_item_name: string;
  metadata_spo_item_path: string;
  metadata_spo_item_content_type: string;
  metadata_spo_item_last_modified: string;
  metadata_spo_item_size: number;
}

export type DocumentSearchResponse = {
  score: number;
  document: AzureSearchDocumentIndex;
};

export const SimpleSearch = async (
  searchText?: string,
  filter?: string
): Promise<ServerActionResponse<Array<DocumentSearchResponse>>> => {
  try {
    const instance = AzureAISearchInstance<AzureSearchDocumentIndex>();
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
  docs: string[],
  chatThreadId: string
): Promise<Array<ServerActionResponse<boolean>>> => {
  try {
    const documentsToIndex: AzureSearchDocumentIndex[] = [];

    for (const doc of docs) {
      const docToAdd: AzureSearchDocumentIndex = {
        id: uniqueId(),
        chatThreadId,
        user: await userHashedId(),
        content: doc,
        metadata_spo_item_name: fileName,
        metadata_spo_item_path: "", // Assuming path is not provided
        metadata_spo_item_content_type: "", // Assuming content_type is not provided
        metadata_spo_item_last_modified: new Date().toISOString(),
        metadata_spo_item_size: Buffer.byteLength(doc, "utf-8"),
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
      `chatThreadId eq '${chatThreadId}'`
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
          filterable: true,
        },
        {
          name: "user",
          type: "Edm.String",
          searchable: true,
          filterable: true,
        },
        {
          name: "chatThreadId",
          type: "Edm.String",
          searchable: true,
          filterable: true,
        },
        {
          name: "content",
          searchable: true,
          type: "Edm.String",
        },
        {
          name: "metadata_spo_item_name",
          type: "Edm.String",
          searchable: true,
        },
        {
          name: "metadata_spo_item_path",
          type: "Edm.String",
        },
        {
          name: "metadata_spo_item_content_type",
          type: "Edm.String",
          filterable: true,
          facetable: true,
        },
        {
          name: "metadata_spo_item_last_modified",
          type: "Edm.DateTimeOffset",
          sortable: true,
        },
        {
          name: "metadata_spo_item_size",
          type: "Edm.Int64",
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
