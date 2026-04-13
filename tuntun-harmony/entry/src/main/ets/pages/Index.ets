import http from '@ohos.net.http';

// ── Types ────────────────────────────────────────────────────────────────────

interface Item {
  id: string;
  name: string;
  quantity: number;
  category: string;
  createdAt: string;
}

// ── Firebase REST helpers ─────────────────────────────────────────────────────

const PROJECT_ID = 'tuntun-a19b0';
const BASE_URL =
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/items`;

function parseDoc(raw: Record<string, Object>): Item {
  const namePath = raw['name'] as string;
  const id = namePath.split('/').pop() as string;
  const fields = raw['fields'] as Record<string, Record<string, string>>;
  return {
    id,
    name: fields['name']?.['stringValue'] ?? '',
    quantity: parseInt(fields['quantity']?.['integerValue'] ?? '1', 10),
    category: fields['category']?.['stringValue'] ?? 'General',
    createdAt: fields['createdAt']?.['timestampValue'] ?? '',
  };
}

async function fetchItems(): Promise<Item[]> {
  const req = http.createHttp();
  try {
    const res = await req.request(BASE_URL, {
      method: http.RequestMethod.GET,
      header: { 'Content-Type': 'application/json' },
      connectTimeout: 10000,
      readTimeout: 10000,
    });
    if (res.responseCode !== 200) return [];
    const body = JSON.parse(res.result as string) as Record<string, Object>;
    const docs = (body['documents'] ?? []) as Array<Record<string, Object>>;
    return docs
      .map(parseDoc)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  } finally {
    req.destroy();
  }
}

async function createItem(name: string, quantity: number, category: string): Promise<void> {
  const req = http.createHttp();
  try {
    await req.request(BASE_URL, {
      method: http.RequestMethod.POST,
      header: { 'Content-Type': 'application/json' },
      extraData: JSON.stringify({
        fields: {
          name: { stringValue: name },
          quantity: { integerValue: String(quantity) },
          category: { stringValue: category },
          createdAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });
  } finally {
    req.destroy();
  }
}

async function updateItem(id: string, name: string, quantity: number, category: string): Promise<void> {
  const req = http.createHttp();
  try {
    const url =
      `${BASE_URL}/${id}?updateMask.fieldPaths=name&updateMask.fieldPaths=quantity&updateMask.fieldPaths=category`;
    await req.request(url, {
      method: http.RequestMethod.PATCH,
      header: { 'Content-Type': 'application/json' },
      extraData: JSON.stringify({
        fields: {
          name: { stringValue: name },
          quantity: { integerValue: String(quantity) },
          category: { stringValue: category },
        },
      }),
    });
  } finally {
    req.destroy();
  }
}

async function deleteItem(id: string): Promise<void> {
  const req = http.createHttp();
  try {
    await req.request(`${BASE_URL}/${id}`, {
      method: http.RequestMethod.DELETE,
    });
  } finally {
    req.destroy();
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

@Entry
@Component
struct Index {
  @State items: Item[] = [];
  @State loading: boolean = true;
  @State showModal: boolean = false;
  @State showDeleteConfirm: boolean = false;
  @State editingId: string = '';
  @State inputName: string = '';
  @State inputQuantity: string = '1';
  @State inputCategory: string = '';
  @State saving: boolean = false;
  private pollTimer: number = -1;

  aboutToAppear(): void {
    this.load();
    this.pollTimer = setInterval(() => { this.load(); }, 5000);
  }

  aboutToDisappear(): void {
    clearInterval(this.pollTimer);
  }

  async load(): Promise<void> {
    const data = await fetchItems();
    this.items = data;
    this.loading = false;
  }

  openAdd(): void {
    this.editingId = '';
    this.inputName = '';
    this.inputQuantity = '1';
    this.inputCategory = '';
    this.showModal = true;
  }

  openEdit(item: Item): void {
    this.editingId = item.id;
    this.inputName = item.name;
    this.inputQuantity = String(item.quantity);
    this.inputCategory = item.category;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingId = '';
  }

  async handleSave(): Promise<void> {
    if (!this.inputName.trim()) return;
    this.saving = true;
    try {
      const qty = parseInt(this.inputQuantity, 10) || 1;
      const cat = this.inputCategory.trim() || 'General';
      if (this.editingId) {
        await updateItem(this.editingId, this.inputName.trim(), qty, cat);
      } else {
        await createItem(this.inputName.trim(), qty, cat);
      }
      this.closeModal();
      await this.load();
    } finally {
      this.saving = false;
    }
  }

  async handleDelete(): Promise<void> {
    if (!this.editingId) return;
    await deleteItem(this.editingId);
    this.showDeleteConfirm = false;
    this.closeModal();
    await this.load();
  }

  // ── Build ───────────────────────────────────────────────────────────────────

  build() {
    Stack({ alignContent: Alignment.BottomEnd }) {

      // ── Main content ────────────────────────────────────────────────────────
      Column() {
        // Header
        Column() {
          Text('Tuntun')
            .fontSize(30)
            .fontWeight(FontWeight.Bold)
            .fontColor('#1A1A2E')
            .letterSpacing(-0.5)
            .width('100%')
          Text(this.items.length === 0
            ? 'No items yet'
            : `${this.items.length} item${this.items.length !== 1 ? 's' : ''}`)
            .fontSize(14)
            .fontColor('#6B7280')
            .margin({ top: 2 })
            .width('100%')
        }
        .padding({ left: 20, right: 20, top: 52, bottom: 12 })
        .width('100%')

        // Body
        if (this.loading) {
          Column() {
            LoadingProgress()
              .color('#4F46E5')
              .width(48)
              .height(48)
          }
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
          .alignItems(HorizontalAlign.Center)

        } else if (this.items.length === 0) {
          Column() {
            Text('Nothing here yet.')
              .fontSize(18)
              .fontWeight(FontWeight.Medium)
              .fontColor('#6B7280')
            Text('Tap + to add your first item.')
              .fontSize(14)
              .fontColor('#9CA3AF')
              .margin({ top: 6 })
          }
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
          .alignItems(HorizontalAlign.Center)

        } else {
          List({ space: 10 }) {
            ForEach(this.items, (item: Item) => {
              ListItem() {
                Row() {
                  Column() {
                    Text(item.name)
                      .fontSize(16)
                      .fontWeight(FontWeight.Medium)
                      .fontColor('#1A1A2E')
                      .maxLines(1)
                    Text(item.category)
                      .fontSize(12)
                      .fontColor('#9CA3AF')
                      .margin({ top: 3 })
                  }
                  .alignItems(HorizontalAlign.Start)
                  .layoutWeight(1)
                  .margin({ right: 12 })

                  Column() {
                    Text(String(item.quantity))
                      .fontSize(17)
                      .fontWeight(FontWeight.Bold)
                      .fontColor('#4F46E5')
                  }
                  .width(44)
                  .height(44)
                  .borderRadius(22)
                  .backgroundColor('#EEF2FF')
                  .justifyContent(FlexAlign.Center)
                  .alignItems(HorizontalAlign.Center)
                }
                .width('100%')
                .padding({ left: 16, right: 16, top: 14, bottom: 14 })
                .backgroundColor(Color.White)
                .borderRadius(14)
                .shadow({ radius: 6, color: '#0000000F', offsetX: 0, offsetY: 1 })
                .onClick(() => this.openEdit(item))
              }
              .padding({ left: 16, right: 16 })
            }, (item: Item) => item.id)
          }
          .layoutWeight(1)
          .padding({ top: 4, bottom: 100 })
        }
      }
      .width('100%')
      .height('100%')
      .backgroundColor('#F5F5F7')

      // ── FAB ─────────────────────────────────────────────────────────────────
      Button('+')
        .fontSize(28)
        .fontColor(Color.White)
        .width(58)
        .height(58)
        .borderRadius(29)
        .backgroundColor('#4F46E5')
        .shadow({ radius: 10, color: '#4F46E566', offsetX: 0, offsetY: 4 })
        .margin({ right: 20, bottom: 36 })
        .onClick(() => this.openAdd())

      // ── Modal ────────────────────────────────────────────────────────────────
      if (this.showModal) {
        Column() {
          // Backdrop
          Column()
            .layoutWeight(1)
            .width('100%')
            .onClick(() => this.closeModal())

          // Sheet
          Column() {
            Text(this.editingId ? 'Edit Item' : 'Add Item')
              .fontSize(20)
              .fontWeight(FontWeight.Bold)
              .fontColor('#1A1A2E')
              .margin({ bottom: 20 })
              .width('100%')

            TextInput({ placeholder: 'Name  (e.g. Diapers)', text: this.inputName })
              .onChange((v) => { this.inputName = v; })
              .fontSize(16)
              .backgroundColor('#F9FAFB')
              .borderRadius(10)
              .margin({ bottom: 12 })

            TextInput({ placeholder: 'Category  (e.g. Baby)', text: this.inputCategory })
              .onChange((v) => { this.inputCategory = v; })
              .fontSize(16)
              .backgroundColor('#F9FAFB')
              .borderRadius(10)
              .margin({ bottom: 12 })

            TextInput({ placeholder: 'Quantity', text: this.inputQuantity })
              .onChange((v) => { this.inputQuantity = v; })
              .type(InputType.Number)
              .fontSize(16)
              .backgroundColor('#F9FAFB')
              .borderRadius(10)
              .margin({ bottom: 20 })

            Row() {
              Button('Cancel')
                .layoutWeight(1)
                .height(48)
                .borderRadius(10)
                .backgroundColor(Color.White)
                .fontColor('#6B7280')
                .fontSize(16)
                .fontWeight(FontWeight.Medium)
                .border({ width: 1, color: '#E5E7EB' })
                .margin({ right: 6 })
                .onClick(() => this.closeModal())

              Button(this.saving ? 'Saving…' : this.editingId ? 'Save' : 'Add')
                .layoutWeight(1)
                .height(48)
                .borderRadius(10)
                .backgroundColor(this.inputName.trim() ? '#4F46E5' : '#A5B4FC')
                .fontColor(Color.White)
                .fontSize(16)
                .fontWeight(FontWeight.Medium)
                .enabled(this.inputName.trim().length > 0 && !this.saving)
                .margin({ left: 6 })
                .onClick(() => { this.handleSave(); })
            }
            .width('100%')

            if (this.editingId) {
              Button('Delete Item')
                .width('100%')
                .height(48)
                .borderRadius(10)
                .backgroundColor(Color.White)
                .fontColor('#EF4444')
                .fontSize(16)
                .fontWeight(FontWeight.Medium)
                .margin({ top: 12 })
                .onClick(() => { this.showDeleteConfirm = true; })
            }
          }
          .width('100%')
          .padding({ left: 24, right: 24, top: 24, bottom: 48 })
          .backgroundColor(Color.White)
          .borderRadius({ topLeft: 24, topRight: 24 })
        }
        .width('100%')
        .height('100%')
        .backgroundColor('rgba(0,0,0,0.45)')
      }

      // ── Delete confirm dialog ────────────────────────────────────────────────
      if (this.showDeleteConfirm) {
        Column() {
          Column() {
            Text('Remove Item')
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .fontColor('#1A1A2E')
              .margin({ bottom: 8 })
            Text(`Remove "${this.inputName}" from the list?`)
              .fontSize(14)
              .fontColor('#6B7280')
              .textAlign(TextAlign.Center)
              .margin({ bottom: 24 })

            Row() {
              Button('Cancel')
                .layoutWeight(1)
                .height(44)
                .borderRadius(10)
                .backgroundColor(Color.White)
                .fontColor('#6B7280')
                .fontSize(16)
                .border({ width: 1, color: '#E5E7EB' })
                .margin({ right: 8 })
                .onClick(() => { this.showDeleteConfirm = false; })

              Button('Remove')
                .layoutWeight(1)
                .height(44)
                .borderRadius(10)
                .backgroundColor('#EF4444')
                .fontColor(Color.White)
                .fontSize(16)
                .margin({ left: 8 })
                .onClick(() => { this.handleDelete(); })
            }
            .width('100%')
          }
          .padding(24)
          .backgroundColor(Color.White)
          .borderRadius(20)
          .width('85%')
        }
        .width('100%')
        .height('100%')
        .backgroundColor('rgba(0,0,0,0.45)')
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
      }
    }
    .width('100%')
    .height('100%')
  }
}
