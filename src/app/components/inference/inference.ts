import { Component, ElementRef, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-inference',
  imports: [],
  templateUrl: './inference.html',
  styleUrl: './inference.css',
})
export class Inference {
  protected readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  protected readonly isDragging = signal(false);
  protected readonly fileName = signal<string | null>(null);
 
  protected openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }
 
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.fileName.set(file ? file.name : null);
  }
 
  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }
 
  protected onDragLeave(): void {
    this.isDragging.set(false);
  }
 
  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    this.fileName.set(file ? file.name : null);
  }


}
