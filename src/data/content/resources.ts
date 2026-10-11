import "server-only";
import type { ResourceArticle } from "@/domain/resource";
import type { ResourceRepository } from "@/data/contracts";

// Sample editorial layouts, not approved guidance or attributed reporting.
const articles: readonly ResourceArticle[] = [
  {
    slug: "prepare-a-project-conversation",
    category: "planning",
    editorialStatus: "sample",
    title: "Prepare for a project conversation",
    summary:
      "Organize what you want to discuss before contacting a professional.",
    sections: [
      {
        heading: "Start with your questions",
        paragraphs: [
          "This sample article shows how a planning resource could be presented. Write down the questions you would like to discuss and the kind of help you are looking for.",
        ],
      },
      {
        heading: "Make room for the details",
        paragraphs: [
          "Bring your project notes to the conversation. Ask the professional to explain their services, the proposed scope and what would happen next. Final editorial content will be supplied and approved before publication.",
        ],
      },
    ],
  },
  {
    slug: "explore-a-new-specialty",
    category: "professionals",
    editorialStatus: "sample",
    title: "Explore a new specialty",
    summary:
      "A starting point for professionals considering an education pathway.",
    sections: [
      {
        heading: "Define what you want to explore",
        paragraphs: [
          "Use this sample layout to imagine a future introduction to professional education. Consider which specialty interests you and the questions you would ask a training provider.",
        ],
      },
      {
        heading: "Review the pathway",
        paragraphs: [
          "Our education page introduces the available specialties. Provider and program selections, entry requirements, costs and timelines still await confirmation. This example does not recommend or endorse a course.",
        ],
      },
    ],
  },
  {
    slug: "read-a-professional-profile",
    category: "platform",
    editorialStatus: "sample",
    title: "Get to know a professional profile",
    summary:
      "Explore services, listed credentials and questions before making an inquiry.",
    sections: [
      {
        heading: "Explore the business",
        paragraphs: [
          "A profile introduces a business and its services. The preview uses fictional businesses to demonstrate how these details will appear.",
        ],
      },
      {
        heading: "Understand credential labels",
        paragraphs: [
          "Reviewed credentials and submitted claims appear separately. A submitted claim is not a reviewed credential. The platform does not issue certifications; questions about a credential can be directed to its issuing organization.",
        ],
      },
    ],
  },
];
export const resourceRepository: ResourceRepository = {
  async list() {
    return articles;
  },
  async get(slug) {
    return articles.find((article) => article.slug === slug) ?? null;
  },
};
