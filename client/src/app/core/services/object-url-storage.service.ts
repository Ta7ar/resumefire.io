import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, Renderer2, RendererFactory2, signal, WritableSignal } from '@angular/core';

interface UrlEntry {
  url: string;
  expiry: Date;
  created: Date
}

@Injectable({
  providedIn: 'root',
})
export class ObjectUrlStorageService {
  private readonly httpClient = inject(HttpClient);
  private renderer: Renderer2;

  private readonly OBJECT_KEY_PREFIX = 'resume_fire_redaction_';
  private _urlEntries: WritableSignal<UrlEntry[]> = signal(
    this.loadSavedUrlEntries(),
  );

  public readonly urlEntries = this._urlEntries.asReadonly();
  public readonly urlEntriesCount = computed(() => this._urlEntries().length)

  constructor(private rendererFactory: RendererFactory2){
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  private loadSavedUrlEntries() {
    const objectKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith(this.OBJECT_KEY_PREFIX),
    );

    let urls: UrlEntry[] = [];
    objectKeys.forEach((key) => {
      let item = localStorage.getItem(key);
      if (item == null) return;
      let urlEntry: UrlEntry = JSON.parse(item);
      urlEntry.created = new Date(urlEntry.created)
      urlEntry.expiry = new Date(urlEntry.expiry)
      
      if (urlEntry.expiry.getTime() < new Date().getTime()) {
        localStorage.removeItem(key);
        return;
      }
      urls.push(urlEntry);

    });
    urls = urls.sort((a,b) => a.expiry.getTime() - b.expiry.getTime())
    return urls;
  }

  saveObjectUrl(url: string) {
    const key = this.OBJECT_KEY_PREFIX + this.urlEntriesCount + 1;
    let expiry = new Date();
    expiry.setDate(new Date().getDate() + 2);
    const newUrlEntry = {
      url: url,
      expiry: expiry,
      created: new Date()
    };
    this._urlEntries.update(entries => [...entries, newUrlEntry])
    localStorage.setItem(key, JSON.stringify(newUrlEntry))
  }

  downloadObject(url: string) {
    this.httpClient.get(url, { responseType: "blob" }).subscribe((blob) => {
      const objectUrl = URL.createObjectURL(blob)
      const a = this.renderer.createElement('a')
      a.href = objectUrl
      a.download = 'resume_fire_redaction.png'
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    })
  }

}
