export interface Project {
    id: string;
    name: string;
    description: string;
    thumbnail: string;
    lastModified: string;
    type: 'design' | 'figjam' | 'slides' | 'make';
    isStarred?: boolean;
    teamName?: string;
    editedBy?: string;
    views?: number;
    likes?: number;
    status?: 'draft' | 'team' | 'all' | 'trash';
    project_layout?: any[];
    subdomain?: string;
    isPublished?: boolean;
    lastPublishedAt?: string;

}
