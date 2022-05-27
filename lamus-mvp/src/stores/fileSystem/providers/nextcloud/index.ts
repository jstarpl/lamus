import { createClient, FileStat, WebDAVClient } from "webdav/web";
import {
  IFileEntry,
  IFileSystemProvider,
  IListResult,
  IMkDirResult,
  IReadResult,
  IWriteResult,
  Path,
} from "../../IFileSystemProvider";

const NEXTCLOUD_ROOT_FOLDER = "/Lamus";

export class NextcloudProvider implements IFileSystemProvider {
  isCloud = true;
  name = "Nextcloud";

  private user: string;
  private password: string;
  private url: string;

  private client: WebDAVClient | null = null;

  constructor(user: string, password: string, url: string) {
    this.user = user;
    this.password = password;
    this.url = url;
  }
  private async tryToFixUrl(): Promise<void> {
    const looksLikeNextcloudWebDav = this.url.match(
      /\/remote.php\/dav\/files\//
    );
    if (looksLikeNextcloudWebDav) return;
    try {
      const probe = await fetch(this.url, {
        headers: {
          Authorization: `Basic ${btoa(this.user + ":" + this.password)}`,
        },
      });
      if (probe.ok) return;
    } catch (e) {
      // didn't connect, that's alright, let's try to form it into a Nextcoud-style url
    }
    const tempUrl = `${this.url}/remote.php/dav/files/${this.user}/`;
    try {
      const probe = await fetch(tempUrl, {
        headers: {
          Authorization: `Basic ${btoa(this.user + ":" + this.password)}`,
        },
      });
      if (probe.ok) {
        this.url = tempUrl;
        return;
      }
    } catch (e) {
      // didn't connect, but there's nothing we can do
    }
  }
  async init(): Promise<void> {
    await this.tryToFixUrl();
    this.client = createClient(this.url, {
      username: this.user,
      password: this.password,
    });

    const rootFolderExists = await this.client.exists(NEXTCLOUD_ROOT_FOLDER);
    if (!rootFolderExists) {
      // ensure that the root folder exists
      this.mkdir([]);
    }
  }
  async list(path: Path): Promise<IListResult> {
    if (!this.client) throw new Error("Not initialized");

    try {
      const contents = (await this.client.getDirectoryContents(
        NEXTCLOUD_ROOT_FOLDER + path.join("/"),
        {
          deep: false,
          details: false,
        }
      )) as FileStat[];

      return {
        ok: true,
        files: Promise.resolve(
          contents.map<IFileEntry>((itemStat) => ({
            fileName: itemStat.basename,
            size: itemStat.size,
            modified: new Date(Date.parse(itemStat.lastmod)),
            dir: itemStat.type === "directory" ? true : false,
          }))
        ),
      };
    } catch (e) {
      return {
        ok: false,
        error: String(e),
      };
    }
  }
  async mkdir(path: Path, name?: string): Promise<IMkDirResult> {
    if (!this.client) throw new Error("Not initialized");

    try {
      await this.client.createDirectory(
        NEXTCLOUD_ROOT_FOLDER + [...path, name].filter(Boolean).join("/"),
        {
          recursive: true,
        }
      );

      return {
        ok: true,
      };
    } catch (e) {
      return {
        ok: false,
        error: String(e),
      };
    }
  }
  async unlink(path: Path, fileName: string): Promise<IMkDirResult> {
    throw new Error("Method not implemented.");
  }
  async read(path: Path, fileName: string): Promise<IReadResult> {
    throw new Error("Method not implemented.");
  }
  async write(
    path: Path,
    fileName: string,
    data: Promise<Blob>,
    meta?: any
  ): Promise<IWriteResult> {
    if (!this.client) throw new Error("Not initialized");

    try {
      const writeStream = await this.client.createWriteStream(
        NEXTCLOUD_ROOT_FOLDER + [...path, fileName].join("/"),
        {
          overwrite: true,
        }
      );
      const readStream = (await data).stream() as unknown as ReadableStream;
      const rd = readStream.getReader();
      do {
        const { done, value } = await rd.read();
        if (done) {
          writeStream.end();
          break;
        }

        writeStream.write(value, (err) => {
          if (err) throw err;
        });
      } while (true); // the reader will be done at some point, and then it will break
      rd.releaseLock();
      await readStream.cancel();

      return {
        ok: true,
      };
    } catch (e) {
      return {
        ok: false,
        error: String(e),
      };
    }
  }
}
