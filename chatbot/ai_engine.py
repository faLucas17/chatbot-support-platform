import os
from openai import OpenAI

# Initialiser le client Grok (xAI)
GROK_API_KEY = os.getenv('GROK_API_KEY')
if GROK_API_KEY:
    client = OpenAI(
        api_key=GROK_API_KEY,
        base_url="https://api.x.ai/v1",
    )
    print("✅ Grok (xAI) configuré avec succès")
else:
    client = None
    print("⚠️ GROK_API_KEY non trouvée dans .env")

def get_bot_response(message_content, tenant):
    """
    Utilise l'API Grok (xAI) - Gratuite avec crédits
    """
    print(f"🔍 Message reçu: {message_content}")
    
    if client is None:
        print("❌ Grok non configuré, utilisation du mock")
        return mock_response(message_content, tenant)
    
    try:
        response = client.chat.completions.create(
            model="grok-4.20-reasoning",
            messages=[
                {
                    "role": "system",
                    "content": """Tu es un assistant de support client. Tu réponds en français, naturellement.

RÈGLES :
- Réponds à toutes les questions du client.
- Sois concis et utile."""
                },
                {
                    "role": "user",
                    "content": message_content
                }
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        bot_response = response.choices[0].message.content
        print("✅ Grok: réponse trouvée")
        return bot_response, True
        
    except Exception as e:
        print(f"❌ Erreur API Grok: {e}")
        # En cas d'erreur (crédits insuffisants), utiliser le mock
        return mock_response(message_content, tenant)


def mock_response(message_content, tenant):
    """
    Mock de secours (base marketing intégrée)
    """
    message_lower = message_content.lower().strip()
    
    marketing_knowledge = {
        'marketing digital': "Le marketing digital regroupe toutes les actions marketing sur les canaux numériques : sites web, réseaux sociaux, email, publicité en ligne, SEO, SEA, etc.",
        'marketing': "Le marketing est l'ensemble des actions visant à satisfaire les besoins des consommateurs.",
        'seo': "Le SEO (Search Engine Optimization) optimise la visibilité d'un site dans les résultats naturels des moteurs de recherche.",
        'sea': "Le SEA (Search Engine Advertising) est la publicité payante sur les moteurs de recherche.",
        'reseaux sociaux': "Les réseaux sociaux permettent de créer du contenu et d'interagir avec les clients.",
        'email marketing': "L'email marketing envoie des emails personnalisés pour promouvoir des produits.",
        'conversion': "La conversion est l'action par laquelle un visiteur réalise un objectif.",
        'taux de conversion': "Le taux de conversion = (nombre de conversions / nombre de visiteurs) × 100.",
        'roi': "Le ROI (Return On Investment) = (Gain - Coût) / Coût × 100.",
        'crm': "Un CRM gère la relation client et centralise les informations.",
        'lead': "Un lead est un contact potentiellement intéressé.",
        'prospect': "Un prospect est un lead qualifié.",
        'fidélisation': "La fidélisation incite les clients à acheter à nouveau.",
        'acquisition': "L'acquisition attire de nouveaux clients.",
    }
    
    for key, value in marketing_knowledge.items():
        if key in message_lower:
            print(f"✅ Mock: match marketing ({key})")
            return value, True
    
    knowledge_items = tenant.knowledge_items.all()
    for item in knowledge_items:
        if item.question:
            if item.question.lower() in message_lower or message_lower in item.question.lower():
                print(f"✅ Mock: match FAQ ({item.question})")
                return item.answer, True
    
    documents = tenant.documents.all()
    for doc in documents:
        if doc.content:
            if len(message_lower) > 5 and doc.content.lower().find(message_lower[:20]) != -1:
                print(f"✅ Mock: match document ({doc.title})")
                return f"📄 **D'après '{doc.title}' :**\n\n{doc.content[:500]}...", True
    
    print("❌ Mock: aucune réponse, escalade vers agent")
    return None, False