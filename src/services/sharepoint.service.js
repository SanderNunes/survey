// src/services/sharepoint.service.js

/**
 * SharePoint Search Filter Operators
 */
export const FilterOperators = {
  EQUALS: "equals",
  CONTAINS: "contains",
  RANGE: "range",
};

/**
 * Builds a search query for SharePoint using the Search REST API.
 */
export const buildSearchQuery = (
  siteUrl,
  folderPath,
  searchTerm,
  options = {}
) => {
  const {
    rowLimit = 50,
    filters = [],
    sort = [],
    selectProperties = [
      "OriginalPath",
      "DocId",
      "FileType",
      "LastModifiedTime",
      "IsDocument",
      "ViewsRecent",
      "FileExtension",
      "ServerRedirectedEmbedURL",
      "ServerRedirectedURL",
      "PictureThumbnailURL",
      "HitHighlightedSummary",
      "Write",
      "Description",
      "Path",
      "Size",
      "Author",
      "Title",
      "Created",
      "Created",
      "Rank",
      "UniqueId",
      "AfricellFileCategory",
    ],
  } = options;

  const formattedPath = folderPath.startsWith("/")
    ? folderPath
    : `/${folderPath}`;
  const queryText = searchTerm ? encodeURIComponent(searchTerm) : "*";
  const pathConstraint = encodeURIComponent(`path:${siteUrl}${formattedPath}*`);

  let refinementFilters = [];
  if (filters.length > 0) {
    refinementFilters = filters.map((filter) => {
      const { property, value, operator = FilterOperators.EQUALS } = filter;
      switch (operator) {
        case FilterOperators.EQUALS:
          return `${property}:equals("${value}")`;
        case FilterOperators.CONTAINS:
          return `${property}:contains("${value}")`;
        case FilterOperators.RANGE:
          if (typeof value === "object" && value.start && value.end) {
            return `${property}:range(${value.start}, ${value.end})`;
          }
          return `${property}:${value}`;
        default:
          return `${property}:${operator}("${value}")`;
      }
    });
  }

  let sortList = "";
  if (sort.length > 0) {
    sortList = sort
      .map((item) => `${item.property}:${item.direction || "ascending"}`)
      .join(",");
  }

  const selectPropertiesStr = selectProperties.join(",");

  let searchUrl = `${siteUrl}/_api/search/query?querytext='${queryText}*'`;
  searchUrl += `&hiddenconstraints='${pathConstraint}'`;
  if (refinementFilters.length > 0) {
    const refinementFiltersStr = encodeURIComponent(
      refinementFilters.join(" AND ")
    );
    searchUrl += `&refinementfilters='${refinementFiltersStr}'`;
  }
  if (sortList) {
    searchUrl += `&sortlist='${encodeURIComponent(sortList)}'`;
  }
  searchUrl += `&selectproperties='${encodeURIComponent(selectPropertiesStr)}'`;
  searchUrl += `&rowlimit=${rowLimit}`;
  searchUrl += `&trimduplicates=true`;

  return searchUrl;
};

/**
 * Executes a search query against the SharePoint REST API.
 */
export const searchSharePointFolderService = async (
  accessToken,
  siteUrl,
  folderPath,
  searchTerm,
  options = {}
) => {
  if (!accessToken) throw new Error("Access token is required");
  if (!siteUrl) throw new Error("Site URL is required");

  const searchUrl = buildSearchQuery(siteUrl, folderPath, searchTerm, options);

  try {
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        Accept: "application/json;odata=verbose",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `SharePoint search failed: ${response.status} - ${JSON.stringify(
          errorData
        )}`
      );
    }

    const data = await response.json();
    const rawResults =
      data.d?.query?.PrimaryQueryResult?.RelevantResults?.Table?.Rows.results ||
      [];

    if (!Array.isArray(rawResults)) {
      console.warn("Unexpected SharePoint response format:", rawResults);
      return [];
    }

    return rawResults.map((item) => {
      if (!item.Cells.results || !Array.isArray(item.Cells.results)) {
        console.warn("Invalid item in SharePoint results:", item.Cells);
        return {};
      }

      const result = {};
      item.Cells.results.forEach((cell) => {


        if (cell && cell.Key && cell.Value !== undefined) {
          result[cell.Key] = cell.Value;
        }
      });
      return result;
    });
  } catch (error) {
    console.error("Error executing SharePoint search:", error);
    throw error;
  }
};

export const searchSharePointListService = async (
    accessToken,
    siteUrl,
    listName,
    searchTerm,
    options = {}
) => {
    if (!accessToken) throw new Error("Access token is required");
    if (!siteUrl) throw new Error("Site URL is required");
    if (!listName) throw new Error("List name is required");

    // Option 1: Use SharePoint Search API (recommended for better search capabilities)
    const searchUrl = buildListSearchQuery(siteUrl, listName, searchTerm, options);

    try {
        const response = await fetch(searchUrl, {
            method: "GET",
            headers: {
                Accept: "application/json;odata=verbose",
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                `SharePoint list search failed: ${response.status} - ${JSON.stringify(errorData)}`
            );
        }

        const data = await response.json();
        const rawResults = data.d?.query?.PrimaryQueryResult?.RelevantResults?.Table?.Rows?.results || [];

        if (!Array.isArray(rawResults)) {
            console.warn("Unexpected SharePoint list search response format:", rawResults);
            return [];
        }

        // Transform search results similar to folder search
        return rawResults.map((item) => {
            if (!item.Cells?.results || !Array.isArray(item.Cells.results)) {
                console.warn("Invalid item in SharePoint list search results:", item.Cells);
                return {};
            }
            const result = {};
            item.Cells.results.forEach((cell) => {
                if (cell && cell.Key && cell.Value !== undefined) {
                    result[cell.Key] = cell.Value;
                }
            });
            // Add identifiers for list items
            result.ContentType = 'Article';
            result.SourceType = 'List';
            return result;
        });

    } catch (error) {
        // Fallback: Use REST API with Title-only search if Search API fails
        console.warn("Search API failed, falling back to REST API with Title search:", error.message);
        return await searchSharePointListFallback(accessToken, siteUrl, listName, searchTerm, options);
    }
};

// Helper function to build search query for lists
const buildListSearchQuery = (siteUrl, listName, searchTerm, options = {}) => {
    const baseUrl = `${siteUrl}/_api/search/query`;
    const rowLimit = options.rowLimit || 500;

    // Search query that targets the specific list and includes Note fields
    const queryText = `${searchTerm} AND (contentclass:STS_ListItem_GenericList OR contentclass:STS_ListItem) AND ListId:{list:${listName}}`;

    const params = new URLSearchParams({
        querytext: `'${queryText}'`,
        selectproperties: `'Title,Summary,ArticleContent,Tags,Created,Modified,Author,Editor,Path,ContentType,ListItemID'`,
        rowlimit: rowLimit.toString(),
        sortlist: 'Modified:descending'
    });

    return `${baseUrl}?${params.toString()}`;
};

// Fallback function using REST API with client-side filtering for Note fields
const searchSharePointListFallback = async (accessToken, siteUrl, listName, searchTerm, options = {}) => {
    const baseUrl = `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items`;
    // Get all items (or recent items) since we can't filter Note fields server-side
    const select = `$select=Id,Title,Summary,ArticleContent,Tags,ArticleSlug,Created,Modified,Author/Title,Editor/Title`;
    const expand = `$expand=Author,Editor`;
    const orderBy = `$orderby=Modified desc`;
    const top = options.rowLimit ? `$top=${options.rowLimit * 2}` : `$top=1000`; // Get more items for client-side filtering

    const searchUrl = `${baseUrl}?${select}&${expand}&${orderBy}&${top}`;

    const response = await fetch(searchUrl, {
        method: "GET",
        headers: {
            Accept: "application/json;odata=verbose",
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
            `SharePoint list fallback search failed: ${response.status} - ${JSON.stringify(errorData)}`
        );
    }

    const data = await response.json();
    const rawResults = data.d?.results || [];

    // Client-side filtering for Note fields
    const searchTermLower = searchTerm.toLowerCase();
    const filteredResults = rawResults.filter(item => {
        const title = (item.Title || '').toLowerCase();
        const summary = (item.Summary || '').toLowerCase();
        const articleContent = (item.ArticleContent || '').toLowerCase();
        const tags = (item.Tags || '').toLowerCase();

        return title.includes(searchTermLower) ||
               summary.includes(searchTermLower) ||
               articleContent.includes(searchTermLower) ||
               tags.includes(searchTermLower);
    });

    // Limit results after filtering
    const finalResults = filteredResults.slice(0, options.rowLimit || 500);

    return finalResults.map((item) => ({
        Id: item.Id,
        Title: item.Title,
        Summary: item.Summary,
        ArticleContent: item.ArticleContent,
        Tags: item.Tags,
        Created: item.Created,
        Modified: item.Modified,
        Author: item.Author?.Title || '',
        Editor: item.Editor?.Title || '',
        slug: item?.ArticleSlug || '',
        ContentType: 'Article',
        SourceType: 'List'
    }));
};

/**
 * Retrieves items from a SharePoint list
 * @param {string} accessToken - The OAuth access token
 * @param {string} siteUrl - The SharePoint site URL
 * @param {string} listId - The GUID or title of the list
 * @param {Object} options - Additional query options
 * @returns {Promise<Array>} - Array of list items
 */
export const getSharePointListItemsService = async (
  accessToken,
  siteUrl,
  listId,
  options = {}
) => {
  if (!accessToken) {
    throw new Error("Access token is required");
  }

  try {
    const isGuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listId);

    let endpoint;
    if (isGuid) {
      endpoint = `${siteUrl}/_api/web/lists(guid'${listId}')/items`;
    } else {
      endpoint = `${siteUrl}/_api/web/lists/getbytitle('${listId}')/items`;
    }

    // Build query string from options
    const queryParams = new URLSearchParams();

    if (options.select) queryParams.append("$select", options.select);
    if (options.expand) queryParams.append("$expand", options.expand);
    if (options.filter) queryParams.append("$filter", options.filter);
    if (options.orderby) queryParams.append("$orderby", options.orderby);
    if (options.top) queryParams.append("$top", options.top);
    if (options.skip) queryParams.append("$skip", options.skip);

    const urlWithParams = queryParams.toString()
      ? `${endpoint}?${queryParams.toString()}`
      : endpoint;

    const response = await fetch(urlWithParams, {
      method: "GET",
      headers: {
        Accept: "application/json;odata=nometadata",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`SharePoint API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error("Error fetching SharePoint list items:", error);
    throw error;
  }
};


/// Update your sharepoint.service.js file with this fixed createSharePointListItemService function

/**
 * Create a new item in a SharePoint list
 * @param {string} accessToken - Access token for authentication
 * @param {string} siteUrl - The SharePoint site URL
 * @param {string} listId - The GUID or title of the list
 * @param {Object} itemData - Data to create the list item
 * @returns {Promise<Object>} - The created list item
 */
export const createSharePointListItemService = async (
  accessToken,
  siteUrl,
  listId,
  itemData
) => {
  try {
    // First, get the list metadata to determine the correct type name
    const listMetadataUrl = `${siteUrl}/_api/web/lists/getbytitle('${listId}')`;

    const listResponse = await fetch(listMetadataUrl, {
      method: "GET",
      headers: {
        Accept: "application/json;odata=verbose",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!listResponse.ok) {
      throw new Error(`Failed to get list metadata: ${listResponse.status}`);
    }

    const listData = await listResponse.json();
    const listItemEntityTypeFullName = listData.d.ListItemEntityTypeFullName;

    // Get request digest for POST operations
    const digestUrl = `${siteUrl}/_api/contextinfo`;
    const digestResponse = await fetch(digestUrl, {
      method: "POST",
      headers: {
        Accept: "application/json;odata=verbose",
        Authorization: `Bearer ${accessToken}`,
        "Content-Length": "0",
      },
    });

    if (!digestResponse.ok) {
      throw new Error(`Failed to get request digest: ${digestResponse.status}`);
    }

    const digestData = await digestResponse.json();
    const requestDigest = digestData.d.GetContextWebInformation.FormDigestValue;

    // Prepare the item data with required metadata
    const itemWithMetadata = {
      __metadata: {
        type: listItemEntityTypeFullName,
      },
      ...itemData,
    };

    // Create the list item
    const createUrl = `${siteUrl}/_api/web/lists/getbytitle('${listId}')/items`;

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: {
        Accept: "application/json;odata=verbose",
        "Content-Type": "application/json;odata=verbose",
        Authorization: `Bearer ${accessToken}`,
        "X-RequestDigest": requestDigest,
      },
      body: JSON.stringify(itemWithMetadata),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(
        `Failed to create item: ${createResponse.status} - ${JSON.stringify(
          errorData
        )}`
      );
    }

    const result = await createResponse.json();
    return result.d;
  } catch (error) {
    console.error("Error in createSharePointListItemService:", error);
    throw error;
  }
};

// Alternative simplified version if you know your list type name:
export const createSharePointListItemServiceSimple = async (
  accessToken,
  siteUrl,
  listId,
  itemData
) => {
  try {
    // Get request digest
    const digestUrl = `${siteUrl}/_api/contextinfo`;
    const digestResponse = await fetch(digestUrl, {
      method: "POST",
      headers: {
        Accept: "application/json;odata=verbose",
        Authorization: `Bearer ${accessToken}`,
        "Content-Length": "0",
      },
    });

    const digestData = await digestResponse.json();
    const requestDigest = digestData.d.GetContextWebInformation.FormDigestValue;

    // For EnrollmentList, the type would typically be something like:
    // SP.Data.EnrollmentListListItem or SP.Data.EnrollmentListItem
    const itemWithMetadata = {
      __metadata: {
        type: `SP.Data.${listId}ListItem`, // This is a common pattern
      },
      ...itemData,
    };

    const createUrl = `${siteUrl}/_api/web/lists/getbytitle('${listId}')/items`;

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: {
        Accept: "application/json;odata=verbose",
        "Content-Type": "application/json;odata=verbose",
        Authorization: `Bearer ${accessToken}`,
        "X-RequestDigest": requestDigest,
      },
      body: JSON.stringify(itemWithMetadata),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(
        `Failed to create item: ${createResponse.status} - ${JSON.stringify(
          errorData
        )}`
      );
    }

    const result = await createResponse.json();
    return result.d;
  } catch (error) {
    console.error("Error in createSharePointListItemService:", error);
    throw error;
  }
};


