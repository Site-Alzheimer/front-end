import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { ConsentModal } from '../consent-modal/consent-modal';

@Component({
  selector: 'app-inference',
  imports: [ConsentModal],
  templateUrl: './inference.html',
  styleUrl: './inference.css',
})
export class Inference {
  protected readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  protected readonly isDragging = signal(false);
  protected readonly fileName = signal<string | null>(null);
  protected readonly consentOpen = signal(false);
  private pendingFile: File | null = null;
 
  protected openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }
 
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.requestConsent(file);
    }
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
    if (file) {
      this.requestConsent(file);
    }
  }

  protected acceptConsent(): void {
    if (this.pendingFile) {
      this.fileName.set(this.pendingFile.name);
    }
    this.pendingFile = null;
    this.consentOpen.set(false);
  }

  protected closeConsent(): void {
    this.pendingFile = null;
    this.consentOpen.set(false);
    const input = this.fileInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  private requestConsent(file: File): void {
    this.pendingFile = file;
    this.consentOpen.set(true);
  }
}
