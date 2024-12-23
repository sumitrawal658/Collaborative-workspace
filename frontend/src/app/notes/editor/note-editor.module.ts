import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { NoteEditorComponent } from './note-editor.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatChipsModule,
    MatIconModule,
    NoteEditorComponent
  ]
})
export class NoteEditorModule {} 