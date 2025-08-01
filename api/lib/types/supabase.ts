/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  "/": {
    get: {
      responses: {
        /** OK */
        200: unknown;
      };
    };
  };
  "/device_settings": {
    get: {
      parameters: {
        query: {
          id?: parameters["rowFilter.device_settings.id"];
          created_at?: parameters["rowFilter.device_settings.created_at"];
          device_id?: parameters["rowFilter.device_settings.device_id"];
          cloud_mode?: parameters["rowFilter.device_settings.cloud_mode"];
          dropbox_refresh_token?: parameters["rowFilter.device_settings.dropbox_refresh_token"];
          nextcloud_url?: parameters["rowFilter.device_settings.nextcloud_url"];
          nextcloud_user?: parameters["rowFilter.device_settings.nextcloud_user"];
          nextcloud_password?: parameters["rowFilter.device_settings.nextcloud_password"];
          last_seen?: parameters["rowFilter.device_settings.last_seen"];
          onedrive_refresh_token?: parameters["rowFilter.device_settings.onedrive_refresh_token"];
          /** Filtering Columns */
          select?: parameters["select"];
          /** Ordering */
          order?: parameters["order"];
          /** Limiting and Pagination */
          offset?: parameters["offset"];
          /** Limiting and Pagination */
          limit?: parameters["limit"];
        };
        header: {
          /** Limiting and Pagination */
          Range?: parameters["range"];
          /** Limiting and Pagination */
          "Range-Unit"?: parameters["rangeUnit"];
          /** Preference */
          Prefer?: parameters["preferCount"];
        };
      };
      responses: {
        /** OK */
        200: {
          schema: definitions["device_settings"][];
        };
        /** Partial Content */
        206: unknown;
      };
    };
    post: {
      parameters: {
        body: {
          /** device_settings */
          device_settings?: definitions["device_settings"];
        };
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** Created */
        201: unknown;
      };
    };
    delete: {
      parameters: {
        query: {
          id?: parameters["rowFilter.device_settings.id"];
          created_at?: parameters["rowFilter.device_settings.created_at"];
          device_id?: parameters["rowFilter.device_settings.device_id"];
          cloud_mode?: parameters["rowFilter.device_settings.cloud_mode"];
          dropbox_refresh_token?: parameters["rowFilter.device_settings.dropbox_refresh_token"];
          nextcloud_url?: parameters["rowFilter.device_settings.nextcloud_url"];
          nextcloud_user?: parameters["rowFilter.device_settings.nextcloud_user"];
          nextcloud_password?: parameters["rowFilter.device_settings.nextcloud_password"];
          last_seen?: parameters["rowFilter.device_settings.last_seen"];
          onedrive_refresh_token?: parameters["rowFilter.device_settings.onedrive_refresh_token"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
    patch: {
      parameters: {
        query: {
          id?: parameters["rowFilter.device_settings.id"];
          created_at?: parameters["rowFilter.device_settings.created_at"];
          device_id?: parameters["rowFilter.device_settings.device_id"];
          cloud_mode?: parameters["rowFilter.device_settings.cloud_mode"];
          dropbox_refresh_token?: parameters["rowFilter.device_settings.dropbox_refresh_token"];
          nextcloud_url?: parameters["rowFilter.device_settings.nextcloud_url"];
          nextcloud_user?: parameters["rowFilter.device_settings.nextcloud_user"];
          nextcloud_password?: parameters["rowFilter.device_settings.nextcloud_password"];
          last_seen?: parameters["rowFilter.device_settings.last_seen"];
          onedrive_refresh_token?: parameters["rowFilter.device_settings.onedrive_refresh_token"];
        };
        body: {
          /** device_settings */
          device_settings?: definitions["device_settings"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
  };
  "/nonces": {
    get: {
      parameters: {
        query: {
          id?: parameters["rowFilter.nonces.id"];
          expires_at?: parameters["rowFilter.nonces.expires_at"];
          value?: parameters["rowFilter.nonces.value"];
          audience?: parameters["rowFilter.nonces.audience"];
          /** Filtering Columns */
          select?: parameters["select"];
          /** Ordering */
          order?: parameters["order"];
          /** Limiting and Pagination */
          offset?: parameters["offset"];
          /** Limiting and Pagination */
          limit?: parameters["limit"];
        };
        header: {
          /** Limiting and Pagination */
          Range?: parameters["range"];
          /** Limiting and Pagination */
          "Range-Unit"?: parameters["rangeUnit"];
          /** Preference */
          Prefer?: parameters["preferCount"];
        };
      };
      responses: {
        /** OK */
        200: {
          schema: definitions["nonces"][];
        };
        /** Partial Content */
        206: unknown;
      };
    };
    post: {
      parameters: {
        body: {
          /** nonces */
          nonces?: definitions["nonces"];
        };
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** Created */
        201: unknown;
      };
    };
    delete: {
      parameters: {
        query: {
          id?: parameters["rowFilter.nonces.id"];
          expires_at?: parameters["rowFilter.nonces.expires_at"];
          value?: parameters["rowFilter.nonces.value"];
          audience?: parameters["rowFilter.nonces.audience"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
    patch: {
      parameters: {
        query: {
          id?: parameters["rowFilter.nonces.id"];
          expires_at?: parameters["rowFilter.nonces.expires_at"];
          value?: parameters["rowFilter.nonces.value"];
          audience?: parameters["rowFilter.nonces.audience"];
        };
        body: {
          /** nonces */
          nonces?: definitions["nonces"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
  };
}

export interface definitions {
  device_settings: {
    /**
     * Format: bigint
     * @description Note:
     * This is a Primary Key.<pk/>
     */
    id: number;
    /**
     * Format: timestamp without time zone
     * @default now()
     */
    created_at: string;
    /**
     * Format: uuid
     * @description Note:
     * This is a Primary Key.<pk/>
     * @default extensions.uuid_generate_v4()
     */
    device_id: string;
    /** Format: character varying */
    cloud_mode?: string;
    /** Format: character varying */
    dropbox_refresh_token?: string;
    /** Format: character varying */
    nextcloud_url?: string;
    /** Format: character varying */
    nextcloud_user?: string;
    /** Format: character varying */
    nextcloud_password?: string;
    /** Format: timestamp without time zone */
    last_seen?: string;
    /** Format: character varying */
    onedrive_refresh_token?: string;
  };
  nonces: {
    /**
     * Format: bigint
     * @description Note:
     * This is a Primary Key.<pk/>
     */
    id: number;
    /** Format: timestamp without time zone */
    expires_at?: string;
    /** Format: character varying */
    value?: string;
    /** Format: json */
    audience?: string;
  };
}

export interface parameters {
  /**
   * @description Preference
   * @enum {string}
   */
  preferParams: "params=single-object";
  /**
   * @description Preference
   * @enum {string}
   */
  preferReturn: "return=representation" | "return=minimal" | "return=none";
  /**
   * @description Preference
   * @enum {string}
   */
  preferCount: "count=none";
  /** @description Filtering Columns */
  select: string;
  /** @description On Conflict */
  on_conflict: string;
  /** @description Ordering */
  order: string;
  /** @description Limiting and Pagination */
  range: string;
  /**
   * @description Limiting and Pagination
   * @default items
   */
  rangeUnit: string;
  /** @description Limiting and Pagination */
  offset: string;
  /** @description Limiting and Pagination */
  limit: string;
  /** @description device_settings */
  "body.device_settings": definitions["device_settings"];
  /** Format: bigint */
  "rowFilter.device_settings.id": string;
  /** Format: timestamp without time zone */
  "rowFilter.device_settings.created_at": string;
  /** Format: uuid */
  "rowFilter.device_settings.device_id": string;
  /** Format: character varying */
  "rowFilter.device_settings.cloud_mode": string;
  /** Format: character varying */
  "rowFilter.device_settings.dropbox_refresh_token": string;
  /** Format: character varying */
  "rowFilter.device_settings.nextcloud_url": string;
  /** Format: character varying */
  "rowFilter.device_settings.nextcloud_user": string;
  /** Format: character varying */
  "rowFilter.device_settings.nextcloud_password": string;
  /** Format: timestamp without time zone */
  "rowFilter.device_settings.last_seen": string;
  /** Format: character varying */
  "rowFilter.device_settings.onedrive_refresh_token": string;
  /** @description nonces */
  "body.nonces": definitions["nonces"];
  /** Format: bigint */
  "rowFilter.nonces.id": string;
  /** Format: timestamp without time zone */
  "rowFilter.nonces.expires_at": string;
  /** Format: character varying */
  "rowFilter.nonces.value": string;
  /** Format: json */
  "rowFilter.nonces.audience": string;
}

export interface operations {}

export interface external {}
